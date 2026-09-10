/**
 * Bootstrap Postgres for a DB-backed seam test: apply the Drizzle migrations
 * and load the hand-seeded demo catalogue. Call it from `beforeAll` so only the
 * suites that need a database pay the cost (pure-logic suites stay infra-free).
 *
 * Requires a reachable Postgres at `DATABASE_URL` — `docker compose up -d`
 * locally; the CI workflow provides a pgvector service.
 */
import { runMigrations } from "@repo/database/migrate";
import { loadDemoStandards } from "../standards/seed/load";

let ready: Promise<void> | undefined;

export function prepareDemoDatabase(): Promise<void> {
  ready ??= (async () => {
    try {
      await runMigrations();
      await loadDemoStandards();
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
