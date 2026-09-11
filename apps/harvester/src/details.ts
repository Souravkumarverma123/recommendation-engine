/**
 * Demo-slice detail + relationship harvest (ticket #11, acceptance criterion 1;
 * docs/PRD.md data strategy (b), user story 31).
 *
 * For each demo-slice standard already in `standards` (the title-level list
 * harvest, or the seed, put it there and gave it a `bisEncId`), this pulls the
 * three per-standard endpoints and lands their authoritative facts:
 *
 *   - `getWebsiteStandardDetails` → the detail columns `mapDetail` owns
 *     (lifecycle, equivalence, revision/amendment counts, reaffirmation, PDF key);
 *   - `getAmendmentDetails`       → one `amendments` row per published amendment;
 *   - `getCrossRefDetails`        → the relationship graph: `REFERS_TO` (forward,
 *     the normative references), `REFERENCED_BY` (reverse — the only place this
 *     exists), `EQUIVALENT_TO` (the ISO/IEC entries), plus `PART_OF` for a
 *     standard that is a part of a family.
 *
 * Forward Indian references are also upserted as title-level `standards` rows
 * (the cross-ref payload carries their number, name and encId) so the edge
 * resolves to a real row and the allied-standards walk can show a title. The
 * reference *sub-type* (test-method / safety / …) is not in the API — it is read
 * off the neighbour's title by `classifyAlliedRole` at query time.
 *
 * The BIS HTTP behaviour lives in `BisClient`; this module needs only the three
 * calls, so the seam test injects a fake `DetailSource` and asserts on row
 * counts (docs/PRD.md §Testing Decisions — the harvester is verified by
 * asserting what lands, not by mocking HTTP).
 */
import { and, db, eq, inArray, notInArray, sql } from "@repo/database";
import {
  amendmentsTable,
  standardEdgesTable,
  standardsTable,
  type EdgeType,
  type InsertStandard,
} from "@repo/database/schema";
import { parseDesignation } from "@repo/services/bis/designation";
import type { BisAmendment, BisCrossRef, BisDetail } from "@repo/services/bis/model";
import { DEMO_STANDARDS } from "@repo/services/standards/seed/demo-standards.data";

import { mapDetail } from "./map-detail";
import { withHarvestRun } from "./harvest-run";

/** The three per-standard endpoints the detail harvest needs from `BisClient`. */
export interface DetailSource {
  getStandardDetails(encId: string): Promise<BisDetail>;
  getAmendments(encId: string): Promise<BisAmendment[]>;
  getCrossRefs(encId: string): Promise<{ forward: BisCrossRef[]; reverse: BisCrossRef[] }>;
}

export interface HarvestDetailsOptions {
  client: DetailSource;
  /**
   * Normalised designation keys to enrich. Defaults to the demo slice — the
   * ~15 standards across the five demo domains.
   */
  targetKeys?: string[];
  /** Reverse citations can run to hundreds; keep at most this many as edges. */
  maxReverseEdges?: number;
  logger?: Pick<Console, "info" | "warn">;
}

export interface HarvestDetailsResult {
  /** Standards whose detail columns were refreshed. */
  standardsEnriched: number;
  /** `amendments` rows inserted or refreshed. */
  amendmentsUpserted: number;
  /** `standard_edges` rows inserted or refreshed. */
  edgesUpserted: number;
  /** Forward-reference standards ingested title-level from the cross-ref payload. */
  companionsIngested: number;
  /** Demo-slice rows skipped because they have no `bisEncId` yet. */
  skippedNoEncId: number;
}

const DEFAULT_MAX_REVERSE_EDGES = 50;

/** Demo designation → its normalised key, in file order (no duplicates). */
function demoSliceEntries(): { number: string; key: string }[] {
  const seen = new Set<string>();
  const entries: { number: string; key: string }[] = [];
  for (const s of DEMO_STANDARDS) {
    const key = parseDesignation(s.number)?.key;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    entries.push({ number: s.number, key });
  }
  return entries;
}

/** The demo slice as a set of normalised designation keys. */
export function demoSliceKeys(): string[] {
  return demoSliceEntries().map((e) => e.key);
}

interface Target {
  id: string;
  bisStandardId: number;
  bisEncId: string | null;
  number: string;
  numberNormalized: string;
  editionYear: number | null;
}

/**
 * A normalised key can match more than one `standards` row — an older edition
 * a full catalogue harvest also picked up, a part, an English/Hindi pair. Pick
 * exactly one per key so "enrich the demo slice" cannot spill onto an
 * unrelated edition: the row whose designation matches `preferredNumberByKey`
 * exactly, else the newest edition sharing the key.
 */
function pickOnePerKey(
  rows: Target[],
  preferredNumberByKey: ReadonlyMap<string, string>,
): Target[] {
  const byKey = new Map<string, Target[]>();
  for (const row of rows) {
    const bucket = byKey.get(row.numberNormalized) ?? [];
    bucket.push(row);
    byKey.set(row.numberNormalized, bucket);
  }

  const picked: Target[] = [];
  for (const [key, group] of byKey) {
    const preferred = preferredNumberByKey.get(key);
    const exact = preferred ? group.find((r) => r.number === preferred) : undefined;
    picked.push(
      exact ?? [...group].sort((a, b) => (b.editionYear ?? 0) - (a.editionYear ?? 0))[0]!,
    );
  }
  return picked;
}

export async function harvestDetails(
  options: HarvestDetailsOptions,
): Promise<HarvestDetailsResult> {
  const log = options.logger ?? console;
  const maxReverse = options.maxReverseEdges ?? DEFAULT_MAX_REVERSE_EDGES;
  // The demo slice's own canonical designations, so the default run resolves
  // each key to exactly the row the demo file names — never a different
  // edition or a Hindi/English sibling that happens to share the key. A
  // caller passing an explicit `targetKeys` (the seam test) has no such
  // preference to offer; ties there fall back to the newest edition.
  const preferredNumberByKey = options.targetKeys
    ? new Map<string, string>()
    : new Map(demoSliceEntries().map((e) => [e.key, e.number]));
  const targetKeys = options.targetKeys ?? [...preferredNumberByKey.keys()];

  const result: HarvestDetailsResult = {
    standardsEnriched: 0,
    amendmentsUpserted: 0,
    edgesUpserted: 0,
    companionsIngested: 0,
    skippedNoEncId: 0,
  };

  await withHarvestRun("details", async () => {
    const rows: Target[] = await db
      .select({
        id: standardsTable.id,
        bisStandardId: standardsTable.bisStandardId,
        bisEncId: standardsTable.bisEncId,
        number: standardsTable.number,
        numberNormalized: standardsTable.numberNormalized,
        editionYear: standardsTable.editionYear,
      })
      .from(standardsTable)
      .where(inArray(standardsTable.numberNormalized, targetKeys));
    const targets = pickOnePerKey(rows, preferredNumberByKey);

    for (const target of targets) {
      if (!target.bisEncId) {
        result.skippedNoEncId += 1;
        continue;
      }
      const encId = target.bisEncId;

      const detail = await options.client.getStandardDetails(encId);
      await db
        .update(standardsTable)
        .set({ ...mapDetail(detail), scrapedAt: new Date(), updatedAt: new Date() })
        .where(eq(standardsTable.id, target.id));
      result.standardsEnriched += 1;

      const amendments = await options.client.getAmendments(encId);
      result.amendmentsUpserted += await upsertAmendments(target, amendments);

      const { forward, reverse } = await options.client.getCrossRefs(encId);
      const graph = await ingestCrossRefs(target, forward, reverse.slice(0, maxReverse));
      result.companionsIngested += graph.companions;
      result.edgesUpserted += graph.edges;

      result.edgesUpserted += await upsertPartOfEdge(target);
    }

    log.info(
      `detail harvest: ${result.standardsEnriched} enriched, ${result.amendmentsUpserted} ` +
        `amendments, ${result.edgesUpserted} edges, ${result.companionsIngested} companions ` +
        `(${result.skippedNoEncId} skipped — no encId)`,
    );

    return {
      recordCount: result.standardsEnriched,
      notes:
        `${result.standardsEnriched} enriched, ${result.amendmentsUpserted} amendments, ` +
        `${result.edgesUpserted} edges, ${result.companionsIngested} companions, ` +
        `${result.skippedNoEncId} skipped (no encId)`,
    };
  });

  return result;
}

/** A whole-digits year string ("2021"), or null for anything else (blank, garbled). */
function toYear(value: string | null | undefined): number | null {
  const trimmed = value?.trim();
  return trimmed && /^\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : null;
}

/**
 * Upsert every amendment the current response lists, then remove any
 * `amendments` row for this standard that the response no longer lists — a
 * corrected or shortened BIS response must not leave a withdrawn amendment (or
 * its stale PDF link) behind (docs/PRD.md §Testing Decisions — the harvester
 * reconciles to what the source says now, not what it said last time).
 */
async function upsertAmendments(
  target: Target,
  amendments: BisAmendment[],
): Promise<number> {
  let n = 0;
  const keepNos = new Set<number>();
  for (const amendment of amendments) {
    keepNos.add(amendment.noOfAmendment);
    await db
      .insert(amendmentsTable)
      .values({
        standardId: target.id,
        bisStandardId: target.bisStandardId,
        amendmentNo: amendment.noOfAmendment,
        year: toYear(amendment.amendmentYear),
        label: amendment.amendmentLabel?.trim() ?? null,
        pdfKey: amendment.is_documents?.trim() ?? null,
      })
      .onConflictDoUpdate({
        target: [
          amendmentsTable.standardId,
          amendmentsTable.amendmentNo,
          amendmentsTable.year,
        ],
        set: {
          label: sql`excluded.label`,
          pdfKey: sql`excluded.pdf_key`,
          scrapedAt: sql`now()`,
        },
      });
    n += 1;
  }

  await db
    .delete(amendmentsTable)
    .where(
      and(
        eq(amendmentsTable.standardId, target.id),
        keepNos.size > 0
          ? notInArray(amendmentsTable.amendmentNo, [...keepNos])
          : sql`true`,
      ),
    );

  return n;
}

/**
 * `isType` on a cross-ref entry: 1 Indian, 2 international (ISO/IEC), 3
 * other-Indian, 4 document-number, 5 reverse (docs/research §5). Forward
 * entries become `REFERS_TO` edges, except the international ones which become
 * `EQUIVALENT_TO`; the reverse list becomes `REFERENCED_BY`.
 *
 * The forward edges (`REFERS_TO` / `EQUIVALENT_TO`) are reconciled to exactly
 * what this response lists — a reference BIS has since removed is deleted, not
 * left behind to keep showing as an allied standard. The reverse list is
 * upsert-only: it is truncated to `maxReverseEdges` before it ever reaches
 * here, so an entry missing from one run's top-N is not evidence BIS removed
 * it, and `allied()` never reads `REFERENCED_BY` anyway.
 */
async function ingestCrossRefs(
  target: Target,
  forward: BisCrossRef[],
  reverse: BisCrossRef[],
): Promise<{ companions: number; edges: number }> {
  let companions = 0;
  let edges = 0;
  const keepForwardRaw = new Set<string>();

  for (const ref of forward) {
    const raw = ref.standardNumber.trim();
    const props = { isType: ref.isType ?? null, typeLabel: ref.typeLabel ?? null };
    keepForwardRaw.add(raw);

    // International references (ISO/IEC/…) — `parseDesignation` deliberately
    // rejects a non-IS series, so store the raw designation and do not resolve.
    if (ref.isType === 2) {
      edges += await upsertEdge({
        srcStandardId: target.id,
        dstStandardId: null,
        dstNumberRaw: raw,
        dstNumberNormalized: parseDesignation(raw)?.key ?? null,
        type: "EQUIVALENT_TO",
        props,
      });
      continue;
    }

    const parsed = parseDesignation(raw);
    if (!parsed) continue;

    // Ingest Indian forward references title-level so the edge resolves and the
    // allied-standards walk has a title to show.
    const resolved = await resolveOrIngestCompanion(ref, parsed.key, parsed.series, parsed.year);
    if (resolved.ingested) companions += 1;

    edges += await upsertEdge({
      srcStandardId: target.id,
      dstStandardId: resolved.id,
      dstNumberRaw: raw,
      dstNumberNormalized: parsed.key,
      type: "REFERS_TO",
      props,
    });
  }

  await db
    .delete(standardEdgesTable)
    .where(
      and(
        eq(standardEdgesTable.srcStandardId, target.id),
        inArray(standardEdgesTable.type, ["REFERS_TO", "EQUIVALENT_TO"]),
        keepForwardRaw.size > 0
          ? notInArray(standardEdgesTable.dstNumberRaw, [...keepForwardRaw])
          : sql`true`,
      ),
    );

  for (const ref of reverse) {
    const parsed = parseDesignation(ref.standardNumber);
    if (!parsed) continue;
    edges += await upsertEdge({
      srcStandardId: target.id,
      dstStandardId: await resolveExisting(parsed.key, ref.standardNumber.trim()),
      dstNumberRaw: ref.standardNumber.trim(),
      dstNumberNormalized: parsed.key,
      type: "REFERENCED_BY",
      props: { isType: ref.isType ?? null, typeLabel: ref.typeLabel ?? null },
    });
  }

  return { companions, edges };
}

/**
 * The id of the `standards` row for `key`, or `null` if none exists. When more
 * than one row shares the key (another edition, a part, an English/Hindi
 * pair), `preferredNumber` — the exact designation this reference actually
 * named — wins the tie; otherwise the newest edition does, rather than an
 * arbitrary row off an unordered query.
 */
async function resolveExisting(
  key: string,
  preferredNumber?: string,
): Promise<string | null> {
  const rows = await db
    .select({ id: standardsTable.id, number: standardsTable.number, editionYear: standardsTable.editionYear })
    .from(standardsTable)
    .where(eq(standardsTable.numberNormalized, key));
  if (rows.length === 0) return null;

  const exact = preferredNumber ? rows.find((r) => r.number === preferredNumber) : undefined;
  return (
    exact ?? [...rows].sort((a, b) => (b.editionYear ?? 0) - (a.editionYear ?? 0))[0]!
  ).id;
}

async function resolveOrIngestCompanion(
  ref: BisCrossRef,
  key: string,
  series: string,
  year: number | null,
): Promise<{ id: string | null; ingested: boolean }> {
  const existing = await resolveExisting(key, ref.standardNumber.trim());
  if (existing) return { id: existing, ingested: false };

  const row: InsertStandard = {
    bisStandardId: ref.standardId,
    bisEncId: ref.standardEncId ?? null,
    number: ref.standardNumber.trim(),
    numberNormalized: key,
    series,
    editionYear: year,
    title: ref.standardName?.trim() || ref.standardNumber.trim(),
  };

  const [inserted] = await db
    .insert(standardsTable)
    .values(row)
    .onConflictDoNothing({ target: standardsTable.bisStandardId })
    .returning({ id: standardsTable.id });

  if (inserted) return { id: inserted.id, ingested: true };
  // A bisStandardId clash with an unrelated row — fall back to the key lookup.
  return { id: await resolveExisting(key, ref.standardNumber.trim()), ingested: false };
}

async function upsertEdge(edge: {
  srcStandardId: string;
  dstStandardId: string | null;
  dstNumberRaw: string;
  dstNumberNormalized: string | null;
  type: EdgeType;
  props: Record<string, unknown>;
}): Promise<number> {
  await db
    .insert(standardEdgesTable)
    .values(edge)
    .onConflictDoUpdate({
      target: [
        standardEdgesTable.srcStandardId,
        standardEdgesTable.dstNumberRaw,
        standardEdgesTable.type,
      ],
      set: {
        dstStandardId: edge.dstStandardId,
        dstNumberNormalized: sql`excluded.dst_number_normalized`,
        props: sql`excluded.props`,
        scrapedAt: sql`now()`,
      },
    });
  return 1;
}

/** A `PART_OF` edge to the bare-number parent, when the target is a part. */
async function upsertPartOfEdge(target: Target): Promise<number> {
  const parsed = parseDesignation(target.number);
  if (!parsed || parsed.part == null) return 0;

  const parentRaw = `${parsed.series} ${parsed.number}`;
  const parentKey = parseDesignation(parentRaw)?.key;
  if (!parentKey || parentKey === parsed.key) return 0;

  return upsertEdge({
    srcStandardId: target.id,
    dstStandardId: await resolveExisting(parentKey),
    dstNumberRaw: parentRaw,
    dstNumberNormalized: parentKey,
    type: "PART_OF",
    props: { source: "part-number" },
  });
}
