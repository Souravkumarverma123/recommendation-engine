/** Tracks each harvest run so we can diff snapshots and show "what changed". */
import { pgTable, uuid, varchar, integer, text, timestamp } from "drizzle-orm/pg-core";

export const harvestKindValues = [
  "list",
  "details",
  "cross_refs",
  "amendments",
  "committees",
  "qco",
] as const;
export type HarvestKind = (typeof harvestKindValues)[number];

export const harvestRunsTable = pgTable("harvest_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: varchar("kind", { length: 24 }).notNull().$type<HarvestKind>(),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
  recordCount: integer("record_count"),
  ok: text("ok"), // null while running, "true"/"false" on completion
  notes: text("notes"),
});

export type SelectHarvestRun = typeof harvestRunsTable.$inferSelect;
export type InsertHarvestRun = typeof harvestRunsTable.$inferInsert;
