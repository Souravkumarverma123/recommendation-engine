/**
 * Loader for the hand-seeded demo catalogue (ticket #6).
 *
 * Reads the reviewed data file, normalises each designation through the single
 * source of truth (`parseDesignation`), and upserts into `standards` keyed on
 * `bisStandardId`. Idempotent: re-running refreshes the rows in place.
 *
 * Run it with `pnpm --filter @repo/services db:seed` (or `pnpm db:seed` from the
 * repo root). The `standards.search` seam test also calls `loadDemoStandards()`
 * directly from its global setup.
 */
import { db, sql } from "@repo/database";
import { standardsTable, type InsertStandard } from "@repo/database/schema";
import { parseDesignation } from "../../bis/designation";
import { DEMO_STANDARDS, type DemoStandard } from "./demo-standards.data";

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
  inserted: number;
}

/**
 * Upsert every demo standard. On conflict (same `bisStandardId`) the mutable
 * catalogue fields are refreshed so an edited data file takes effect on re-run.
 */
export async function loadDemoStandards(): Promise<LoadResult> {
  const rows = buildDemoRows();

  await db
    .insert(standardsTable)
    .values(rows)
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
        updatedAt: new Date(),
      },
    });

  return { inserted: rows.length };
}
