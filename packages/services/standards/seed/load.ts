/**
 * Loader for the hand-seeded demo catalogue (tickets #6, #9).
 *
 * Reads the reviewed data file, normalises each designation through the single
 * source of truth (`parseDesignation`), and reconciles it into `standards`.
 *
 * Two modes, chosen per row:
 *
 *   - **Top-up** — once the full-catalogue harvest (ticket #9) has run, a real
 *     BIS row already exists for the designation. The loader then only *enriches*
 *     it with the reviewed detail fields the title-level harvest cannot supply:
 *     the team-written `summary`, lifecycle `isStatus`, `supersededByRaw`, the
 *     standard type and the edition year.
 *   - **Seed** — no catalogue row exists yet (a bare `pnpm db:seed`, or the seam
 *     tests). The loader inserts the demo row itself, in the reserved
 *     `DEMO_BIS_ID_MIN`..`DEMO_BIS_ID_MAX` id band.
 *
 * Idempotent either way: re-running refreshes in place, prunes demo-band rows no
 * longer listed (or now superseded by a real harvested row), and drops the
 * embedding of any row it touched so `embedDemoStandards` refills it.
 *
 * Run it with `pnpm --filter @repo/services db:seed` (or `pnpm db:seed` from the
 * repo root). The `standards.search` seam test also calls `loadDemoStandards()`
 * directly from its global setup.
 */
import { and, db, eq, gte, lt, notInArray, sql } from "@repo/database";
import { standardsTable, type InsertStandard } from "@repo/database/schema";
import { parseDesignation } from "../../bis/designation";
import {
  DEMO_BIS_ID_MAX,
  DEMO_BIS_ID_MIN,
  DEMO_STANDARDS,
  type DemoStandard,
} from "./demo-standards.data";

/** Shape one reviewed demo row into a `standards` insert. */
export function toInsertStandard(row: DemoStandard): InsertStandard {
  const parsed = parseDesignation(row.number);
  if (!parsed) {
    throw new Error(`demo seed: unparseable designation "${row.number}"`);
  }
  return {
    bisStandardId: row.bisStandardId,
    number: row.number,
    numberNormalized: parsed.key,
    series: row.series,
    editionYear: row.editionYear,
    title: row.title,
    typeOfStandard: row.typeOfStandard,
    groupName: row.committee,
    isStatus: row.isStatus,
    supersededByRaw: row.supersededByRaw ?? null,
    summary: row.summary,
  };
}

/** All reviewed demo rows, shaped for insertion. Pure — no DB access. */
export function buildDemoRows(): InsertStandard[] {
  return DEMO_STANDARDS.map(toInsertStandard);
}

export interface LoadResult {
  /** Reviewed rows processed. */
  upserted: number;
  /** Demo-band rows removed (dropped from the file, or now backed by a harvested row). */
  pruned: number;
  /** Rows enriched in place on top of a harvested catalogue record. */
  toppedUp: number;
}

/** The reviewed detail fields a top-up writes onto a harvested row. */
function detailFields(row: InsertStandard) {
  return {
    series: row.series,
    editionYear: row.editionYear,
    typeOfStandard: row.typeOfStandard,
    groupName: row.groupName,
    isStatus: row.isStatus,
    supersededByRaw: row.supersededByRaw ?? null,
    summary: row.summary,
    // summary / number / title feed the embedding — drop it so the backfill
    // recomputes the vector from the enriched text.
    embedding: sql`null`,
    updatedAt: new Date(),
  };
}

/**
 * Reconcile the demo slice to exactly what the data file declares, in one
 * transaction:
 *
 *   1. For each reviewed row, enrich a matching harvested catalogue row (same
 *      normalised designation, outside the demo id band) with the detail fields.
 *   2. Delete demo-band rows that are no longer listed, or whose designation is
 *      now covered by a harvested row (so the standard is not searchable twice).
 *   3. Insert / refresh the demo-band rows for designations not yet harvested.
 */
export async function loadDemoStandards(): Promise<LoadResult> {
  const rows = buildDemoRows();

  return db.transaction(async (tx) => {
    const seedRows: InsertStandard[] = [];
    let toppedUp = 0;

    for (const row of rows) {
      const enriched = await tx
        .update(standardsTable)
        .set(detailFields(row))
        .where(
          and(
            eq(standardsTable.numberNormalized, row.numberNormalized),
            lt(standardsTable.bisStandardId, DEMO_BIS_ID_MIN),
          ),
        )
        .returning({ id: standardsTable.id });

      if (enriched.length > 0) toppedUp += enriched.length;
      else seedRows.push(row);
    }

    const keepBandIds = seedRows.map((row) => row.bisStandardId);
    const pruned = await tx
      .delete(standardsTable)
      .where(
        and(
          gte(standardsTable.bisStandardId, DEMO_BIS_ID_MIN),
          lt(standardsTable.bisStandardId, DEMO_BIS_ID_MAX),
          keepBandIds.length > 0
            ? notInArray(standardsTable.bisStandardId, keepBandIds)
            : sql`true`,
        ),
      )
      .returning({ id: standardsTable.id });

    if (seedRows.length > 0) {
      await tx
        .insert(standardsTable)
        .values(seedRows)
        .onConflictDoUpdate({
          target: standardsTable.bisStandardId,
          set: {
            number: sql`excluded.number`,
            numberNormalized: sql`excluded.number_normalized`,
            series: sql`excluded.series`,
            editionYear: sql`excluded.edition_year`,
            title: sql`excluded.title`,
            typeOfStandard: sql`excluded.type_of_standard`,
            groupName: sql`excluded.group_name`,
            isStatus: sql`excluded.is_status`,
            supersededByRaw: sql`excluded.superseded_by_raw`,
            summary: sql`excluded.summary`,
            // The embedding is derived from number + title + summary. Any of
            // those may have just changed, so drop it — `embedDemoStandards`
            // refills it when a key is available; without one, a null beats a
            // stale vector.
            embedding: sql`null`,
            updatedAt: new Date(),
          },
        });
    }

    return { upserted: rows.length, pruned: pruned.length, toppedUp };
  });
}
