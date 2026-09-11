/**
 * Bootstrap Postgres for a DB-backed seam test: apply the Drizzle migrations,
 * reset the catalogue to exactly the hand-seeded demo slice, backfill
 * deterministic embeddings, and load the hand-seeded QCO obligations. Call it
 * from `beforeAll` so only the suites that need a database pay the cost
 * (pure-logic suites stay infra-free).
 *
 * The reset matters now that `apps/harvester` exists: a dev machine that has run
 * a full catalogue harvest would otherwise leave ~24k rows in the same database,
 * and the seam assertions ("this query matches nothing in the demo set") are
 * written against the demo slice alone (docs/PRD.md §Testing Decisions — the
 * fixture is "a test Postgres seeded with the ~15 demo standards"). CI starts
 * from an empty database, so the delete is a no-op there.
 *
 * Embeddings use the deterministic fake provider (no OpenAI, no spend) so the
 * semantic half of `standards.search` is exercised offline.
 *
 * Requires a reachable Postgres at `DATABASE_URL` — `docker compose up -d`
 * locally; the CI workflow provides a pgvector service.
 */
import { db, lt } from "@repo/database";
import { harvestRunsTable, standardsTable } from "@repo/database/schema";
import { runMigrations } from "@repo/database/migrate";
import { loadDemoQcos } from "../qco/seed/load";
import { embedDemoStandards } from "../standards/seed/embed";
import { loadDemoEdges } from "../standards/seed/edges";
import { loadDemoStandards } from "../standards/seed/load";
import { DEMO_BIS_ID_MIN } from "../standards/seed/demo-standards.data";
import { fakeEmbeddingProvider } from "./fake-embeddings";

let ready: Promise<void> | undefined;

export function prepareDemoDatabase(): Promise<void> {
  ready ??= (async () => {
    try {
      await runMigrations();
      // Drop any harvested catalogue rows so the fixture is the demo slice only.
      await db.delete(standardsTable).where(lt(standardsTable.bisStandardId, DEMO_BIS_ID_MIN));
      await db.delete(harvestRunsTable);
      await loadDemoStandards();
      await loadDemoEdges();
      await embedDemoStandards(fakeEmbeddingProvider);
      await loadDemoQcos();
    } catch (err) {
      throw new Error(
        "seam test setup could not prepare Postgres. Is the database up " +
          "(`docker compose up -d`) and DATABASE_URL set?\n" +
          String(err),
      );
    }
  })();
  return ready;
}
