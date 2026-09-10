/**
 * Programmatic migration runner.
 *
 * `pnpm db:migrate` (drizzle-kit) is the operator path; this helper is for code
 * that needs the schema applied in-process — notably the integration seams that
 * spin up against the CI Postgres service (docs/PRD.md §Testing Decisions).
 */
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";

/** Drizzle migrations live next to this file, at `packages/database/drizzle`. */
const MIGRATIONS_FOLDER = path.join(__dirname, "drizzle");

export async function runMigrations(
  migrationsFolder: string = MIGRATIONS_FOLDER,
): Promise<void> {
  await migrate(db, { migrationsFolder });
}
