-- pgvector: required by standards.embedding (vector(1536)) and the HNSW index.
-- Enabled on the Docker image via scripts/init-db.sql; repeated here so the
-- migration also applies against a hosted Postgres (Neon/RDS/Supabase).
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"standard_id" uuid NOT NULL,
	"bis_standard_id" integer NOT NULL,
	"amendment_no" integer NOT NULL,
	"year" integer,
	"label" varchar(80),
	"pdf_key" text,
	"scraped_at" timestamp DEFAULT now(),
	CONSTRAINT "amendments_standard_no_uq" UNIQUE NULLS NOT DISTINCT("standard_id","amendment_no","year")
);
--> statement-breakpoint
CREATE TABLE "standard_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"src_standard_id" uuid NOT NULL,
	"dst_standard_id" uuid,
	"dst_number_raw" varchar(200) NOT NULL,
	"dst_number_normalized" varchar(200),
	"type" varchar(24) NOT NULL,
	"props" jsonb,
	"scraped_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "standards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bis_standard_id" integer NOT NULL,
	"bis_enc_id" text,
	"pk_is_id" integer,
	"number" varchar(120) NOT NULL,
	"number_normalized" varchar(120) NOT NULL,
	"series" varchar(24),
	"edition_year" integer,
	"title" text NOT NULL,
	"title_hindi" text,
	"short_title" text,
	"type_of_standard" varchar(80),
	"committee_id" integer,
	"department_id" integer,
	"group_name" text,
	"sub_group_name" text,
	"sub_sub_group_name" text,
	"ics_code" varchar(40),
	"equivalence_type" varchar(40),
	"equivalent_is_number" varchar(120),
	"is_status" integer,
	"withdraw_status" integer,
	"withdrawn_on" date,
	"superseded_by_raw" varchar(200),
	"revision_count" integer,
	"amendment_count" integer,
	"reaffirmation_on" date,
	"valid_upto" date,
	"published_on" date,
	"pdf_key" text,
	"embedding" vector(1536),
	"summary" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("number", '')), 'A') || setweight(to_tsvector('english', coalesce(title, '')), 'B') || setweight(to_tsvector('english', coalesce(summary, '')), 'C')) STORED,
	"raw" jsonb,
	"scraped_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "committees" (
	"id" integer PRIMARY KEY NOT NULL,
	"number" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"alias_name" varchar(16),
	"department_id" integer,
	"converted_name" text
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"alias_name" varchar(16),
	"scope" text
);
--> statement-breakpoint
CREATE TABLE "qco_obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qco_id" uuid NOT NULL,
	"is_number_raw" varchar(200) NOT NULL,
	"is_number_normalized" varchar(200),
	"standard_id" uuid,
	"product_label" text,
	"scheme" varchar(4),
	"specific_requirement" text,
	"status" varchar(16) DEFAULT 'MANDATORY' NOT NULL,
	"enforcement_date" date,
	"concurrent_until" date,
	"scraped_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "qcos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"so_numbers" text[],
	"so_dates" date[],
	"ministry" varchar(160),
	"gazette_pdf_url" text,
	"source_url" text,
	"is_horizontal" text,
	"raw" jsonb,
	"scraped_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "harvest_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(24) NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp,
	"record_count" integer,
	"ok" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "amendments" ADD CONSTRAINT "amendments_standard_id_standards_id_fk" FOREIGN KEY ("standard_id") REFERENCES "public"."standards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standard_edges" ADD CONSTRAINT "standard_edges_src_standard_id_standards_id_fk" FOREIGN KEY ("src_standard_id") REFERENCES "public"."standards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standard_edges" ADD CONSTRAINT "standard_edges_dst_standard_id_standards_id_fk" FOREIGN KEY ("dst_standard_id") REFERENCES "public"."standards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qco_obligations" ADD CONSTRAINT "qco_obligations_qco_id_qcos_id_fk" FOREIGN KEY ("qco_id") REFERENCES "public"."qcos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qco_obligations" ADD CONSTRAINT "qco_obligations_standard_id_standards_id_fk" FOREIGN KEY ("standard_id") REFERENCES "public"."standards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "standard_edges_uq" ON "standard_edges" USING btree ("src_standard_id","dst_number_raw","type");--> statement-breakpoint
CREATE INDEX "standard_edges_src_type_idx" ON "standard_edges" USING btree ("src_standard_id","type");--> statement-breakpoint
CREATE INDEX "standard_edges_dst_idx" ON "standard_edges" USING btree ("dst_standard_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "standards_bis_standard_id_uq" ON "standards" USING btree ("bis_standard_id");--> statement-breakpoint
CREATE INDEX "standards_number_normalized_idx" ON "standards" USING btree ("number_normalized");--> statement-breakpoint
CREATE INDEX "standards_committee_idx" ON "standards" USING btree ("committee_id");--> statement-breakpoint
CREATE INDEX "standards_is_status_idx" ON "standards" USING btree ("is_status");--> statement-breakpoint
CREATE INDEX "standards_embedding_idx" ON "standards" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "standards_search_vector_idx" ON "standards" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "qco_obligations_is_norm_idx" ON "qco_obligations" USING btree ("is_number_normalized");--> statement-breakpoint
CREATE INDEX "qco_obligations_standard_idx" ON "qco_obligations" USING btree ("standard_id");