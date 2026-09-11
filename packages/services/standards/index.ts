/**
 * Standards search service — the retrieval half of the recommendation pipeline.
 *
 * Ticket #6: lexical (Postgres full-text) search over the seeded demo catalogue.
 * Ticket #7: pgvector cosine search over `standards.embedding`, fused with the
 * lexical list by Reciprocal Rank Fusion — all behind this same `search()`
 * method and its frozen contract. A query with no keyword overlap with a
 * standard's text can now still surface it via the semantic list.
 */
import { db, inArray, sql } from "@repo/database";
import { standardsTable } from "@repo/database/schema";
import { parseDesignation } from "../bis/designation";
import { defaultEmbeddingProvider, type EmbeddingProvider } from "../llm/embeddings";
import {
  standardsSearchInputSchema,
  toLifecycleStatus,
  type StandardSearchHit,
  type StandardsSearchInput,
  type StandardsSearchOutput,
} from "./model";
import {
  ALLIED_EDGE_TYPES,
  resolveAlliedRole,
  type AlliedRelation,
  type AlliedStandard,
} from "./allied";
import {
  MAX_CHAIN_HOPS,
  resolveVersion,
  VersionIndex,
  type VersionRow,
  type VersionResolution,
} from "./version";

interface RankedRow extends Record<string, unknown> {
  number: string;
  title: string;
  is_status: number | null;
  score: number;
}

/**
 * RRF constant. 60 is the value from the original Cormack et al. paper and the
 * usual default; it damps the contribution of low-ranked items so a document
 * near the top of either list dominates one that is mid-pack in both.
 */
const RRF_K = 60;

/**
 * How long `search()` waits for the semantic list before returning lexical
 * results alone. A slow or hung embedding call must not hold up results that
 * are already in hand.
 */
const SEMANTIC_BUDGET_MS = 2500;

/** Resolve to `promise`, or to `fallback` if it rejects or outruns `ms`. */
function withinBudget<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    const settle = (value: T) => {
      clearTimeout(timer);
      resolve(value);
    };
    promise.then(settle, () => settle(fallback));
  });
}

export interface StandardsServiceOptions {
  /**
   * Embedding provider for the semantic list. Defaults to the OpenAI provider
   * when `OPENAI_API_KEY` is set (and never in tests — inject a fake). `null`
   * disables semantic search and `search()` runs lexical-only.
   */
  embeddings?: EmbeddingProvider | null;
}

export class StandardsService {
  private readonly embeddings: EmbeddingProvider | null;

  constructor(options: StandardsServiceOptions = {}) {
    this.embeddings =
      options.embeddings === undefined ? defaultEmbeddingProvider() : options.embeddings;
  }

  /**
   * Ranked catalogue matches for a plain-language query or a designation.
   * Input is re-validated here so the method is safe to call outside tRPC.
   *
   * Runs the lexical and semantic lists concurrently and fuses them with RRF.
   * The semantic half is bounded by `SEMANTIC_BUDGET_MS` and swallows its own
   * errors, so a slow, hung or failing embedding call degrades the response to
   * lexical-only rather than blocking or erroring — results in hand matter more
   * than the semantic half.
   */
  async search(input: StandardsSearchInput): Promise<StandardsSearchOutput> {
    const { query, limit } = standardsSearchInputSchema.parse(input);

    const empty: StandardSearchHit[] = [];
    const [lexical, semantic] = await Promise.all([
      this.lexicalSearch(query, limit),
      withinBudget(this.semanticSearch(query, limit), SEMANTIC_BUDGET_MS, empty),
    ]);

    const results = fuseByRrf([lexical, semantic], limit);
    return { results };
  }

  /**
   * Postgres full-text search over the `standards.search_vector` generated
   * column (designation weighted 'A', title 'B', team summary 'C'). Ranked with
   * `ts_rank_cd`; ties broken by the newer edition. Returns `[]` when the query
   * reduces to no searchable terms (e.g. only stop words).
   *
   * Two passes: the strict `websearch_to_tsquery` (all terms must match) first,
   * then — only if it found nothing — the same terms OR-ed together, so one
   * noise token (a quantity like "500", a stray adjective) can't zero out an
   * otherwise strong match. The semantic list usually covers this, but the
   * fallback keeps lexical-only deployments (no embedding key) useful.
   */
  async lexicalSearch(query: string, limit: number): Promise<StandardSearchHit[]> {
    const strict = await this.runLexical(
      sql`websearch_to_tsquery('english', ${query})`,
      limit,
    );
    if (strict.length > 0) return strict;

    return this.runLexical(
      sql`to_tsquery('english', (
        select string_agg(quote_literal(lexeme), ' | ')
        from unnest(tsvector_to_array(to_tsvector('english', ${query}))) as lexeme
      ))`,
      limit,
    );
  }

  private async runLexical(
    tsquery: ReturnType<typeof sql>,
    limit: number,
  ): Promise<StandardSearchHit[]> {
    const result = await db.execute<RankedRow>(sql`
      select
        "number",
        title,
        is_status,
        ts_rank_cd(search_vector, ${tsquery}) as score
      from standards
      where search_vector @@ ${tsquery}
      order by score desc, edition_year desc nulls last, "number" asc
      limit ${limit}
    `);

    return result.rows.map(toHit);
  }

  /**
   * pgvector cosine search over `standards.embedding`. Embeds the query with the
   * configured provider and ranks catalogue rows by cosine similarity. Returns
   * `[]` when there is no provider, or when the query embeds to the zero vector
   * (the fake test embedder does this for text it recognises no concept in —
   * there is nothing meaningful to rank by).
   */
  async semanticSearch(query: string, limit: number): Promise<StandardSearchHit[]> {
    if (!this.embeddings) return [];

    const [vector] = await this.embeddings.embed([query]);
    if (!vector || vector.every((v) => v === 0)) return [];

    const literal = `[${vector.join(",")}]`;
    const result = await db.execute<RankedRow>(sql`
      select
        "number",
        title,
        is_status,
        1 - (embedding <=> ${literal}::vector) as score
      from standards
      where embedding is not null
      order by embedding <=> ${literal}::vector
      limit ${limit}
    `);

    return result.rows.map(toHit);
  }

  /**
   * The allied standards of each designation in `numbers` — the neighbours
   * reached by walking `REFERS_TO` and `PART_OF` edges out of it, tagged by the
   * role they play in a specification (docs/PRD.md user stories 17–19).
   *
   * Only edges whose target resolved to an ingested `standards` row are
   * returned: an unresolved reference has no title to show and no type to
   * classify. Results are keyed by the source designation exactly as passed in;
   * a designation with no allied standards is absent from the map. Deduplicated
   * per source — a standard reached by more than one edge appears once, the
   * more specific `REFERS_TO` winning over `PART_OF`.
   */
  async allied(numbers: string[]): Promise<Map<string, AlliedStandard[]>> {
    const wanted = [...new Set(numbers)].filter((n) => n.length > 0);
    if (wanted.length === 0) return new Map();

    const numberList = sql.join(
      wanted.map((n) => sql`${n}`),
      sql`, `,
    );
    const typeList = sql.join(
      ALLIED_EDGE_TYPES.map((t) => sql`${t}`),
      sql`, `,
    );
    const rows = await db.execute<{
      src_number: string;
      relation: string;
      number: string;
      title: string;
      is_status: number | null;
      type_of_standard: string | null;
      props: unknown;
    }>(sql`
      select
        src."number"          as src_number,
        e."type"              as relation,
        dst."number"          as "number",
        dst.title             as title,
        dst.is_status         as is_status,
        dst.type_of_standard  as type_of_standard,
        e.props               as props
      from standard_edges e
      join standards src on src.id = e.src_standard_id
      join standards dst on dst.id = e.dst_standard_id
      where src."number" in (${numberList})
        and e."type" in (${typeList})
      order by src_number, dst."number"
    `);

    const byNumber = new Map<string, Map<string, AlliedStandard>>();
    for (const row of rows.rows) {
      const relation = row.relation as AlliedRelation;
      const bucket = byNumber.get(row.src_number) ?? new Map<string, AlliedStandard>();
      const existing = bucket.get(row.number);
      // REFERS_TO is the more informative edge — let it win a tie with PART_OF.
      if (existing && !(existing.relation === "PART_OF" && relation === "REFERS_TO")) {
        continue;
      }
      bucket.set(row.number, {
        number: row.number,
        title: row.title,
        role: resolveAlliedRole(row.props, {
          title: row.title,
          typeOfStandard: row.type_of_standard,
        }),
        relation,
        lifecycleStatus: toLifecycleStatus(row.is_status),
      });
      byNumber.set(row.src_number, bucket);
    }

    return new Map(
      [...byNumber].map(([src, bucket]) => [
        src,
        [...bucket.values()].sort(
          (a, b) => a.role.localeCompare(b.role) || a.number.localeCompare(b.number),
        ),
      ]),
    );
  }

  /**
   * The current-edition resolution of each designation in `numbers`
   * (docs/PRD.md §Pipeline step 7, user stories 7-10) — follows `isStatus` /
   * `supersededByRaw` from each shortlisted standard to the edition that
   * actually applies today, however many hops, number changes, or part
   * re-homings that takes.
   *
   * Fetches only what the walk can actually need: round 0 is every edition of
   * the requested designations (scoped by `where number_normalized in (...)`,
   * the same shape `allied()` uses); each further round fetches only the
   * `supersededByRaw` targets the previous round's withdrawn rows introduced
   * and this call hasn't already fetched, capped at {@link MAX_CHAIN_HOPS}
   * rounds — the same ceiling {@link resolveVersion}'s own walk respects. A
   * real BIS chain is one or two hops, so this is a handful of small, indexed
   * queries rather than one scan of the whole catalogue. The walk itself is the
   * pure {@link resolveVersion}. Results are keyed by the exact designation
   * passed in; a designation the index has no row for is absent from the map.
   */
  async resolveVersions(numbers: string[]): Promise<Map<string, VersionResolution>> {
    const wanted = [...new Set(numbers)].filter((n) => n.length > 0);
    if (wanted.length === 0) return new Map();

    const rows: VersionRow[] = [];
    const fetchedKeys = new Set<string>();
    let frontier = new Set(
      wanted
        .map((n) => parseDesignation(n)?.key)
        .filter((key): key is string => key != null),
    );

    for (let hop = 0; hop < MAX_CHAIN_HOPS && frontier.size > 0; hop++) {
      const toFetch = [...frontier].filter((key) => !fetchedKeys.has(key));
      if (toFetch.length === 0) break;
      toFetch.forEach((key) => fetchedKeys.add(key));

      const batch = await db
        .select({
          number: standardsTable.number,
          title: standardsTable.title,
          isStatus: standardsTable.isStatus,
          supersededByRaw: standardsTable.supersededByRaw,
          validUpto: standardsTable.validUpto,
          editionYear: standardsTable.editionYear,
        })
        .from(standardsTable)
        .where(inArray(standardsTable.numberNormalized, toFetch));
      rows.push(...batch);

      frontier = new Set(
        batch
          .filter((row) => toLifecycleStatus(row.isStatus) === "WITHDRAWN" && row.supersededByRaw)
          .map((row) => parseDesignation(row.supersededByRaw as string)?.key)
          .filter((key): key is string => key != null && !fetchedKeys.has(key)),
      );
    }

    const index = new VersionIndex(rows);
    const resolved = new Map<string, VersionResolution>();
    for (const number of wanted) {
      const resolution = resolveVersion(number, index);
      if (resolution) resolved.set(number, resolution);
    }
    return resolved;
  }
}

function toHit(row: RankedRow): StandardSearchHit {
  return {
    number: row.number,
    title: row.title,
    isStatus: row.is_status,
    lifecycleStatus: toLifecycleStatus(row.is_status),
    score: Number(row.score),
  };
}

/**
 * Reciprocal Rank Fusion of any number of ranked lists (docs/PRD.md §Pipeline
 * step 3). Each list contributes `1 / (RRF_K + rank)` to a standard's fused
 * score; lists are combined by designation. The returned `score` is the fused
 * value — comparable within one response, not a probability. Ties break on the
 * best single-list relevance, then designation, so the order is deterministic.
 */
function fuseByRrf(lists: StandardSearchHit[][], limit: number): StandardSearchHit[] {
  const fused = new Map<string, { hit: StandardSearchHit; score: number; best: number }>();

  for (const list of lists) {
    list.forEach((hit, rank) => {
      const contribution = 1 / (RRF_K + rank + 1);
      const existing = fused.get(hit.number);
      if (existing) {
        existing.score += contribution;
        existing.best = Math.max(existing.best, hit.score);
      } else {
        fused.set(hit.number, { hit, score: contribution, best: hit.score });
      }
    });
  }

  return [...fused.values()]
    .sort(
      (a, b) =>
        b.score - a.score || b.best - a.best || a.hit.number.localeCompare(b.hit.number),
    )
    .slice(0, limit)
    .map(({ hit, score }) => ({ ...hit, score }));
}

export const standardsService = new StandardsService();
