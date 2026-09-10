/**
 * Regulatory overlay — Quality Control Orders and the per-standard obligations
 * they create. Scraped from the 4 compulsory-certification HTML tables on
 * bis.gov.in + the "Upcoming QCOs" table + gazette PDFs.
 *
 * This layer is queried INDEPENDENTLY of the standards layer — the engine never
 * infers "mandatory" from a standard's existence (BIS Rules 2018, Rule 24).
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { standardsTable } from "./standards";

/** Which certification scheme the obligation runs through. */
export const qcoSchemeValues = ["I", "II", "IV", "X"] as const;
export type QcoScheme = (typeof qcoSchemeValues)[number];

export const qcosTable = pgTable("qcos", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(), // "Furniture (Quality Control) Order, 2025"
  soNumbers: text("so_numbers").array(), // ["S.O. 801(E)"]
  soDates: date("so_dates").array(),
  ministry: varchar("ministry", { length: 160 }), // reliable only from the upcoming-QCO table
  gazettePdfUrl: text("gazette_pdf_url"),
  sourceUrl: text("source_url"),
  isHorizontal: text("is_horizontal"), // scope-predicate QCOs (e.g. Household Appliances 2024) — always human-review
  raw: jsonb("raw"),
  scrapedAt: timestamp("scraped_at").defaultNow(),
});

export type SelectQco = typeof qcosTable.$inferSelect;
export type InsertQco = typeof qcosTable.$inferInsert;

export const qcoObligationsTable = pgTable(
  "qco_obligations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    qcoId: uuid("qco_id")
      .notNull()
      .references(() => qcosTable.id, { onDelete: "cascade" }),

    // The IS number exactly as printed in the schedule (often dirty), plus normalised form.
    isNumberRaw: varchar("is_number_raw", { length: 200 }).notNull(),
    isNumberNormalized: varchar("is_number_normalized", { length: 200 }),
    standardId: uuid("standard_id").references(() => standardsTable.id, {
      onDelete: "set null",
    }),

    productLabel: text("product_label"),
    scheme: varchar("scheme", { length: 4 }).$type<QcoScheme>(),
    specificRequirement: text("specific_requirement"), // Scheme X: rating/category condition
    status: varchar("status", { length: 16 }).notNull().default("MANDATORY"), // MANDATORY | UPCOMING
    enforcementDate: date("enforcement_date"), // only reliably present for UPCOMING rows
    concurrentUntil: date("concurrent_until"),

    scrapedAt: timestamp("scraped_at").defaultNow(),
  },
  (t) => [
    index("qco_obligations_is_norm_idx").on(t.isNumberNormalized),
    index("qco_obligations_standard_idx").on(t.standardId),
  ],
);

export type SelectQcoObligation = typeof qcoObligationsTable.$inferSelect;
export type InsertQcoObligation = typeof qcoObligationsTable.$inferInsert;
