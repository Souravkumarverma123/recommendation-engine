/**
 * Loader for the hand-seeded QCO obligations (ticket #8).
 *
 * The MVP has exactly one QCO data source — the reviewed file next to this one —
 * so the loader owns the whole `qcos` / `qco_obligations` slice: it wipes both
 * tables and rewrites them from the data file. When the full Scheme I/II/IV/X
 * scraper lands (a P0 follow-up) it replaces this with real reconciliation.
 *
 * Each obligation's `standardId` is resolved here by matching the normalised
 * designation (`parseDesignation`) against `standards.number_normalized`, so the
 * regulatory layer links to the catalogue without depending on it at query time.
 *
 * `pnpm db:seed` runs this after the catalogue load (so obligation → standard
 * FKs resolve); the seam tests call `loadDemoQcos()` directly from their DB
 * bootstrap.
 */
import { db } from "@repo/database";
import {
  qcoObligationsTable,
  qcosTable,
  standardsTable,
  type QcoScheme,
} from "@repo/database/schema";
import { parseDesignation } from "../../bis/designation";
import { DEMO_QCOS } from "./demo-qcos.data";

export interface QcoLoadResult {
  qcos: number;
  obligations: number;
}

export async function loadDemoQcos(): Promise<QcoLoadResult> {
  return db.transaction(async (tx) => {
    const standards = await tx
      .select({ id: standardsTable.id, key: standardsTable.numberNormalized })
      .from(standardsTable);
    const standardIdByKey = new Map(standards.map((s) => [s.key, s.id]));

    // Child first — no ON DELETE CASCADE reliance, and it keeps the intent clear.
    await tx.delete(qcoObligationsTable);
    await tx.delete(qcosTable);

    let obligations = 0;
    for (const qco of DEMO_QCOS) {
      const [row] = await tx
        .insert(qcosTable)
        .values({
          title: qco.title,
          soNumbers: qco.soNumbers,
          soDates: qco.soDates,
          ministry: qco.ministry,
          gazettePdfUrl: qco.gazettePdfUrl ?? null,
          sourceUrl: qco.sourceUrl,
        })
        .returning({ id: qcosTable.id });

      for (const obligation of qco.obligations) {
        const key = parseDesignation(obligation.isNumberRaw)?.key ?? null;
        await tx.insert(qcoObligationsTable).values({
          qcoId: row!.id,
          isNumberRaw: obligation.isNumberRaw,
          isNumberNormalized: key,
          standardId: key ? (standardIdByKey.get(key) ?? null) : null,
          productLabel: obligation.productLabel,
          scheme: obligation.scheme as QcoScheme,
          specificRequirement: obligation.specificRequirement ?? null,
          status: obligation.status,
          enforcementDate: obligation.enforcementDate ?? null,
        });
        obligations++;
      }
    }

    return { qcos: DEMO_QCOS.length, obligations };
  });
}
