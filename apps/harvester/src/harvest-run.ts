/**
 * Records each harvest in `harvest_runs` (ticket #9, acceptance criterion 2):
 * a row is opened before the work starts and closed when it finishes, carrying
 * the kind, the record count, both timestamps and an ok / failed flag. A crash
 * mid-harvest still leaves a row with `ok = "false"` and the error in `notes`.
 */
import { db, eq } from "@repo/database";
import { harvestRunsTable, type HarvestKind } from "@repo/database/schema";

export interface HarvestRunOutcome {
  /** Rows written by this run — stored on `harvest_runs.record_count`. */
  recordCount: number;
  /** Free-text summary stored on `harvest_runs.notes`. */
  notes?: string;
}

/**
 * Open a `harvest_runs` row, run `work`, then close the row. On success the row
 * gets `ok = "true"`, the count and the notes; on failure `ok = "false"` and the
 * error text, and the error is re-thrown.
 */
export async function withHarvestRun(
  kind: HarvestKind,
  work: () => Promise<HarvestRunOutcome>,
): Promise<HarvestRunOutcome> {
  const [run] = await db
    .insert(harvestRunsTable)
    .values({ kind })
    .returning({ id: harvestRunsTable.id });
  const runId = run!.id;

  try {
    const outcome = await work();
    await db
      .update(harvestRunsTable)
      .set({
        finishedAt: new Date(),
        recordCount: outcome.recordCount,
        ok: "true",
        notes: outcome.notes ?? null,
      })
      .where(eq(harvestRunsTable.id, runId));
    return outcome;
  } catch (error) {
    // Never let a bookkeeping failure mask the real error — record best-effort
    // and always re-throw the original.
    try {
      await db
        .update(harvestRunsTable)
        .set({
          finishedAt: new Date(),
          ok: "false",
          notes: String(
            error instanceof Error ? error.stack ?? error.message : error,
          ).slice(0, 2000),
        })
        .where(eq(harvestRunsTable.id, runId));
    } catch (recordError) {
      console.error(`harvest-run ${runId}: could not record failure`, recordError);
    }
    throw error;
  }
}
