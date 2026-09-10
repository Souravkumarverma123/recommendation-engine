/**
 * Vitest global setup for `@repo/services`.
 *
 * The `standards.search` seam is a real integration test (docs/PRD.md §Testing
 * Decisions): it runs against Postgres, not a mock. This applies the Drizzle
 * migrations and loads the hand-seeded demo catalogue once per run, so the
 * search suite has the ~15 demo standards to query.
 *
 * Requires a reachable Postgres at `DATABASE_URL` (`docker compose up -d`
 * locally; the CI workflow provides a pgvector service). Pure-logic suites in
 * this package do not touch the database — they just run after this completes.
 */
import { runMigrations } from "@repo/database/migrate";
import { loadDemoStandards } from "../standards/seed/load";

export default async function setup(): Promise<void> {
  try {
    await runMigrations();
    await loadDemoStandards();
  } catch (err) {
    throw new Error(
      "services test setup failed to prepare Postgres. Is the database up " +
        "(`docker compose up -d`) and DATABASE_URL set?\n" +
        String(err),
    );
  }
}
