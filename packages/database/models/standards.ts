/**
 * Core catalogue + relationship graph, harvested from the BIS new-portal API
 * (standardsadmin.bis.gov.in). See docs/research/sih26108-bis-ecosystem-data-archaeology.md.
 *
 * Phase-0 schema — iterate freely. Authoritative facts live here; the LLM never
 * writes to these tables.
 */
import { sql } from "drizzle-orm";
import {
  customType,
  pgTable,
  uuid,
  integer,
  varchar,
  text,
  date,
  timestamp,
  jsonb,
  vector,
  index,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * OpenAI `text-embedding-3-small` — fixed 1536 dims. Frozen day-1 contract
 * (docs/PRD.md §Database); ingestion and retrieval must agree on this exact value.
 */
export const EMBEDDING_DIM = 1536;

/** Postgres full-text search vector — not a built-in Drizzle column type. */
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const standardsTable = pgTable(
  "standards",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // BIS identifiers
    bisStandardId: integer("bis_standard_id").notNull(), // their `standardId` (int PK)
    bisEncId: text("bis_enc_id"), // `standardEncId` — needed for detail calls; may rotate
    pkIsId: integer("pk_is_id"), // legacy services-portal id (`pk_is_id`)

    // Designation
    number: varchar("number", { length: 120 }).notNull(), // "IS 456:2000"
    numberNormalized: varchar("number_normalized", { length: 120 }).notNull(), // "is456:2000"
    series: varchar("series", { length: 24 }), // IS | SP | IS/IEC | IS/ISO | IS/ISO/IEC
    editionYear: integer("edition_year"),

    // Titles
    title: text("title").notNull(),
    titleHindi: text("title_hindi"),
    shortTitle: text("short_title"),

    // Classification
    typeOfStandard: varchar("type_of_standard", { length: 80 }), // "Code of Practice", "Product Specification"
    committeeId: integer("committee_id"),
    departmentId: integer("department_id"),
    groupName: text("group_name"),
    subGroupName: text("sub_group_name"),
    subSubGroupName: text("sub_sub_group_name"),
    icsCode: varchar("ics_code", { length: 40 }),

    // ISO/IEC equivalence
    equivalenceType: varchar("equivalence_type", { length: 40 }), // "Not Equivalent" | "Identical" | "Modified"
    equivalentIsNumber: varchar("equivalent_is_number", { length: 120 }),

    // Lifecycle
    isStatus: integer("is_status"), // 2 = active/published, 5 = withdrawn/superseded
    withdrawStatus: integer("withdraw_status"),
    withdrawnOn: date("withdrawn_on"),
    supersededByRaw: varchar("superseded_by_raw", { length: 200 }), // raw `superseded_byis`
    revisionCount: integer("revision_count"),
    amendmentCount: integer("amendment_count"),
    reaffirmationOn: date("reaffirmation_on"),
    validUpto: date("valid_upto"),
    publishedOn: date("published_on"),

    // Documents
    pdfKey: text("pdf_key"), // `is_documents` — OCI object key, download is auth-gated

    // Retrieval
    embedding: vector("embedding", { dimensions: EMBEDDING_DIM }),
    summary: text("summary"), // team-written / paraphrased scope — NEVER copied clause text

    /**
     * Lexical-search vector, maintained by Postgres. Designation weighted highest
     * ('A'), then title ('B'), then the team-written summary ('C'). Queried with
     * `ts_rank_cd` and fused with the pgvector results via RRF (docs/PRD.md §Pipeline).
     */
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', coalesce("number", '')), 'A') || setweight(to_tsvector('english', coalesce(title, '')), 'B') || setweight(to_tsvector('english', coalesce(summary, '')), 'C')`,
    ),

    // Provenance
    raw: jsonb("raw"), // full detail payload for anything not modelled above
    scrapedAt: timestamp("scraped_at").defaultNow(),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("standards_bis_standard_id_uq").on(t.bisStandardId),
    index("standards_number_normalized_idx").on(t.numberNormalized),
    index("standards_committee_idx").on(t.committeeId),
    index("standards_is_status_idx").on(t.isStatus),
    index("standards_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
    index("standards_search_vector_idx").using("gin", t.searchVector),
  ],
);

export type SelectStandard = typeof standardsTable.$inferSelect;
export type InsertStandard = typeof standardsTable.$inferInsert;

/** One row per published amendment to a standard edition (getAmendmentDetails). */
export const amendmentsTable = pgTable(
  "amendments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    standardId: uuid("standard_id")
      .notNull()
      .references(() => standardsTable.id, { onDelete: "cascade" }),
    bisStandardId: integer("bis_standard_id").notNull(),
    amendmentNo: integer("amendment_no").notNull(), // resets to 1 on each revision
    year: integer("year"),
    label: varchar("label", { length: 80 }), // "First Amendment"
    pdfKey: text("pdf_key"),
    scrapedAt: timestamp("scraped_at").defaultNow(),
  },
  (t) => [
    // `year` is nullable (the BIS payload sometimes omits it). NULLS NOT DISTINCT
    // so a re-harvest can't insert a duplicate (std, amendment_no, NULL) row.
    unique("amendments_standard_no_uq")
      .on(t.standardId, t.amendmentNo, t.year)
      .nullsNotDistinct(),
  ],
);

export type SelectAmendment = typeof amendmentsTable.$inferSelect;
export type InsertAmendment = typeof amendmentsTable.$inferInsert;

/**
 * The relationship graph. `dst` may point at a standard we have not ingested,
 * so the raw target designation is always stored; `dstStandardId` is filled in
 * by the entity-resolution step when a match is found.
 */
export const edgeTypeValues = [
  "REFERS_TO", // forward normative reference (crossRefData)
  "REFERENCED_BY", // reverse citation (crossFollowRefData)
  "SUPERSEDED_BY",
  "AMALGAMATES",
  "PART_OF",
  "EQUIVALENT_TO", // -> ISO/IEC
  "AMENDED_BY",
] as const;
export type EdgeType = (typeof edgeTypeValues)[number];

export const standardEdgesTable = pgTable(
  "standard_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    srcStandardId: uuid("src_standard_id")
      .notNull()
      .references(() => standardsTable.id, { onDelete: "cascade" }),
    dstStandardId: uuid("dst_standard_id").references(() => standardsTable.id, {
      onDelete: "set null",
    }),
    dstNumberRaw: varchar("dst_number_raw", { length: 200 }).notNull(),
    dstNumberNormalized: varchar("dst_number_normalized", { length: 200 }),
    type: varchar("type", { length: 24 }).notNull().$type<EdgeType>(),
    props: jsonb("props"),
    scrapedAt: timestamp("scraped_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("standard_edges_uq").on(t.srcStandardId, t.dstNumberRaw, t.type),
    index("standard_edges_src_type_idx").on(t.srcStandardId, t.type),
    index("standard_edges_dst_idx").on(t.dstStandardId, t.type),
  ],
);

export type SelectStandardEdge = typeof standardEdgesTable.$inferSelect;
export type InsertStandardEdge = typeof standardEdgesTable.$inferInsert;
