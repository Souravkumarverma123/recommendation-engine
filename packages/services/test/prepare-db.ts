/**
 * Bootstrap Postgres for a DB-backed seam test: apply the Drizzle migrations,
 * load the hand-seeded demo catalogue, backfill deterministic embeddings, and
 * load the hand-seeded QCO obligations. Call it from `beforeAll` so only the
 * suites that need a database pay the cost (pure-logic suites stay infra-free).
 *
 * Embeddings use the deterministic fake provider (no OpenAI, no spend) so the
 * semantic half of `standards.search` is exercised offline (docs/PRD.md
 * §Testing Decisions).
 *
 * Requires a reachable Postgres at `DATABASE_URL` — `docker compose up -d`
 * locally; the CI workflow provides a pgvector service.
 */
import { runMigrations } from "@repo/database/migrate";
import { loadDemoQcos } from "../qco/seed/load";
import { embedDemoStandards } from "../standards/seed/embed";
import { loadDemoStandards } from "../standards/seed/load";
import { fakeEmbeddingProvider } from "./fake-embeddings";

let ready: Promise<void> | undefined;

export function prepareDemoDatabase(): Promise<void> {
  ready ??= (async () => {
    try {
      await runMigrations();
      await loadDemoStandards();
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
