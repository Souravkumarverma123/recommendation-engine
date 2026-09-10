/**
 * Standards search service — the retrieval half of the recommendation pipeline.
 *
 * Ticket #6: lexical (Postgres full-text) search over the seeded demo catalogue.
 * Ticket #7: pgvector cosine search over `standards.embedding`, fused with the
 * lexical list by Reciprocal Rank Fusion — all behind this same `search()`
 * method and its frozen contract. A query with no keyword overlap with a
 * standard's text can now still surface it via the semantic list.
 */
import { db, sql } from "@repo/database";
import { defaultEmbeddingProvider, type EmbeddingProvider } from "../llm/embeddings";
import {
  standardsSearchInputSchema,
  toLifecycleStatus,
  type StandardSearchHit,
  type StandardsSearchInput,
  type StandardsSearchOutput,
} from "./model";

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
   */
  async lexicalSearch(query: string, limit: number): Promise<StandardSearchHit[]> {
    const tsquery = sql`websearch_to_tsquery('english', ${query})`;
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
