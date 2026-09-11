/**
 * Loader for the hand-seeded allied-standards graph (ticket #11).
 *
 * Reconciles `DEMO_EDGES` into `standard_edges`:
 *
 *   1. Resolve every edge endpoint to a real `standards` row. Demo standards
 *      are already loaded by `loadDemoStandards`, and a full-catalogue harvest
 *      may have loaded some companions title-level already. Companions with no
 *      catalogue row yet are inserted title-level in the reserved
 *      `ALLIED_BIS_ID_MIN` band (above the demo band, so a re-seed of
 *      `demo-standards.data.ts` never prunes them).
 *   2. Upsert one `standard_edges` row per reviewed relationship, with the
 *      source and target foreign keys resolved and the curated role on `props`.
 *   3. Drop allied-band companion rows, and edges out of demo standards, that
 *      the file no longer names.
 *
 * Idempotent: re-running refreshes in place. Run after `loadDemoStandards`
 * (`load.cli.ts` and the seam-test setup both do).
 */
import { createHash } from "node:crypto";

import { and, db, gte, inArray, lt, notInArray, sql } from "@repo/database";
import { standardEdgesTable, standardsTable, type InsertStandard } from "@repo/database/schema";

import { parseDesignation } from "../../bis/designation";
import { ALLIED_BIS_ID_MIN, DEMO_EDGES, type DemoEdge } from "./demo-edges.data";

/**
 * Width of the companion id band. A designation's id is derived from its own
 * key (see {@link companionBisId}), not from its position in a filtered list —
 * a concurrent seed run, or a catalogue row appearing/disappearing between the
 * lookup and the insert, can reorder or reshape that list, and a position-based
 * id would then let two different designations land on the same
 * `bisStandardId` and silently overwrite each other's row on conflict.
 */
const ALLIED_BIS_ID_RANGE = 1_000_000;

/** Stable id for a companion designation — the same key always maps to the same id, run over run and process over process. */
function companionBisId(key: string): number {
  const digest = createHash("sha1").update(key).digest();
  return ALLIED_BIS_ID_MIN + (digest.readUInt32BE(0) % ALLIED_BIS_ID_RANGE);
}

export interface LoadEdgesResult {
  /** Reviewed relationships processed. */
  edges: number;
  /** Title-level companion rows inserted or refreshed in the allied band. */
  companions: number;
  /** Allied-band rows pruned because the file no longer names them. */
  pruned: number;
}

const keyOf = (raw: string): string => parseDesignation(raw)?.key ?? "";

/** One reviewed target → a title-level `standards` insert. */
function companionRow(edge: DemoEdge, bisStandardId: number): InsertStandard {
  const parsed = parseDesignation(edge.to);
  if (!parsed) throw new Error(`demo edges: unparseable target designation "${edge.to}"`);
  return {
    bisStandardId,
    number: edge.to,
    numberNormalized: parsed.key,
    series: parsed.series,
    editionYear: parsed.year,
    title: edge.toTitle,
    typeOfStandard: edge.toType ?? null,
  };
}

export async function loadDemoEdges(): Promise<LoadEdgesResult> {
  return db.transaction(async (tx) => {
    const targetKeys = [...new Set(DEMO_EDGES.flatMap((e) => [e.from, e.to]))]
      .map(keyOf)
      .filter(Boolean);

    // Rows outside the allied band (demo standards, or real harvested rows) —
    // the authoritative catalogue. Allied-band rows are excluded so a stale one
    // never keeps us from re-inserting a fresh companion.
    const catalogue = await tx
      .select({
        id: standardsTable.id,
        key: standardsTable.numberNormalized,
        number: standardsTable.number,
        editionYear: standardsTable.editionYear,
      })
      .from(standardsTable)
      .where(
        and(
          inArray(standardsTable.numberNormalized, targetKeys),
          lt(standardsTable.bisStandardId, ALLIED_BIS_ID_MIN),
        ),
      );

    const resolve = (
      rows: { id: string; key: string; number: string; editionYear: number | null }[],
      raw: string,
    ): string | null => {
      const key = keyOf(raw);
      const matches = rows.filter((r) => r.key === key);
      if (matches.length === 0) return null;
      const exact = matches.find((r) => r.number === raw);
      return (
        exact ?? [...matches].sort((a, b) => (b.editionYear ?? 0) - (a.editionYear ?? 0))[0]!
      ).id;
    };

    // Targets with no catalogue row yet → a title-level companion in the allied
    // band, keyed by `companionBisId` so the id depends only on the designation
    // itself — never on this list's order — and a re-run updates in place.
    const needCompanion = DEMO_EDGES.filter(
      (e) => resolve(catalogue, e.to) === null,
    ).filter(
      (e, i, arr) => arr.findIndex((x) => keyOf(x.to) === keyOf(e.to)) === i,
    );
    const companionRows = needCompanion.map((e) =>
      companionRow(e, companionBisId(keyOf(e.to))),
    );

    let companionResolved: typeof catalogue = [];
    if (companionRows.length > 0) {
      companionResolved = await tx
        .insert(standardsTable)
        .values(companionRows)
        .onConflictDoUpdate({
          target: standardsTable.bisStandardId,
          set: {
            number: sql`excluded.number`,
            numberNormalized: sql`excluded.number_normalized`,
            series: sql`excluded.series`,
            editionYear: sql`excluded.edition_year`,
            title: sql`excluded.title`,
            typeOfStandard: sql`excluded.type_of_standard`,
            updatedAt: new Date(),
          },
        })
        .returning({
          id: standardsTable.id,
          key: standardsTable.numberNormalized,
          number: standardsTable.number,
          editionYear: standardsTable.editionYear,
        });
    }

    // Prune allied-band rows the file no longer references (cascades to edges).
    const keepBandIds = companionRows.map((r) => r.bisStandardId!);
    const prunedRows = await tx
      .delete(standardsTable)
      .where(
        and(
          gte(standardsTable.bisStandardId, ALLIED_BIS_ID_MIN),
          keepBandIds.length > 0
            ? notInArray(standardsTable.bisStandardId, keepBandIds)
            : sql`true`,
        ),
      )
      .returning({ id: standardsTable.id });

    const all = [...catalogue, ...companionResolved];

    // Upsert the edges.
    const demoSourceIds = new Set<string>();
    for (const edge of DEMO_EDGES) {
      const srcId = resolve(all, edge.from);
      const dstId = resolve(all, edge.to);
      if (!srcId) {
        throw new Error(`demo edges: source "${edge.from}" is not a loaded standard`);
      }
      demoSourceIds.add(srcId);
      await tx
        .insert(standardEdgesTable)
        .values({
          srcStandardId: srcId,
          dstStandardId: dstId,
          dstNumberRaw: edge.to,
          dstNumberNormalized: keyOf(edge.to) || null,
          type: edge.relation,
          props: { role: edge.role, source: "demo-seed" },
        })
        .onConflictDoUpdate({
          target: [
            standardEdgesTable.srcStandardId,
            standardEdgesTable.dstNumberRaw,
            standardEdgesTable.type,
          ],
          set: {
            dstStandardId: dstId,
            dstNumberNormalized: sql`excluded.dst_number_normalized`,
            props: sql`excluded.props`,
            scrapedAt: sql`now()`,
          },
        });
    }

    // Drop allied edges out of demo sources that the file no longer lists.
    if (demoSourceIds.size > 0) {
      await tx
        .delete(standardEdgesTable)
        .where(
          and(
            inArray(standardEdgesTable.srcStandardId, [...demoSourceIds]),
            inArray(standardEdgesTable.type, ["REFERS_TO", "PART_OF"]),
            notInArray(
              standardEdgesTable.dstNumberRaw,
              DEMO_EDGES.map((e) => e.to),
            ),
          ),
        );
    }

    return {
      edges: DEMO_EDGES.length,
      companions: companionResolved.length,
      pruned: prunedRows.length,
    };
  });
}
