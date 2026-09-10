/**
 * Full-catalogue harvest (ticket #9, acceptance criterion 1).
 *
 * Walks every page of `getWebsiteIndianStandardsList` and upserts each row into
 * `standards`, keyed on the BIS `standardId`. Idempotent: a re-run refreshes the
 * title-level fields in place and never duplicates a row. The embedding is
 * dropped only when the text it is derived from actually changed, so a re-harvest
 * does not force a full 24k re-embed.
 *
 * The HTTP behaviour (throttle, retry, pagination) lives in `BisClient`; this
 * module only needs something that yields `BisListItem`s, so the seam test can
 * inject a fake catalogue.
 */
import { db, sql } from "@repo/database";
import { standardsTable, type InsertStandard } from "@repo/database/schema";
import type { BisListItem } from "@repo/services/bis/model";

import { mapListItem } from "./map-list-item";

/** The slice of `BisClient` the harvest needs — one async stream of rows. */
export interface CatalogueSource {
  iterateAllStandards(opts?: { pageSize?: number }): AsyncIterable<BisListItem>;
}

export interface HarvestCatalogueOptions {
  client: CatalogueSource;
  /** Rows per upsert statement. Default 500. */
  batchSize?: number;
  /** Rows per catalogue page (BIS caps at 100). */
  pageSize?: number;
  /** Stop after this many fetched rows — for a bounded smoke run. */
  maxItems?: number;
  /** Called after each batch lands, with the running upsert total. */
  onProgress?: (upserted: number) => void;
}

export interface HarvestCatalogueResult {
  /** Rows pulled from the API. */
  fetched: number;
  /** Rows written (insert or update). */
  upserted: number;
  /** Rows whose designation could not be parsed and were left out. */
  skipped: number;
  /** Up to 25 of the skipped designations, for diagnosing parser gaps. */
  skippedSamples: string[];
}

/** How many skipped designations to keep for the run's diagnostics. */
const SKIPPED_SAMPLE_LIMIT = 25;

export async function harvestCatalogue(
  options: HarvestCatalogueOptions,
): Promise<HarvestCatalogueResult> {
  const batchSize = options.batchSize ?? 500;
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  const skippedSamples: string[] = [];
  let batch: InsertStandard[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await upsertBatch(batch);
    upserted += batch.length;
    batch = [];
    options.onProgress?.(upserted);
  };

  for await (const item of options.client.iterateAllStandards({ pageSize: options.pageSize })) {
    fetched += 1;
    const row = mapListItem(item);
    if (row) {
      batch.push(row);
      if (batch.length >= batchSize) await flush();
    } else {
      skipped += 1;
      if (skippedSamples.length < SKIPPED_SAMPLE_LIMIT) {
        skippedSamples.push(item.standardNumber);
      }
    }
    if (options.maxItems != null && fetched >= options.maxItems) break;
  }
  await flush();

  return { fetched, upserted, skipped, skippedSamples };
}

/**
 * One `INSERT … ON CONFLICT (bis_standard_id) DO UPDATE`. Only the title-level
 * fields this harvest owns are refreshed; the demo seed's `summary` / `is_status`
 * top-up and the detail harvest's fields are left untouched. `embedding` is
 * cleared only when `number` or `title` changed — otherwise a re-harvest would
 * needlessly re-embed the whole catalogue.
 */
async function upsertBatch(rows: InsertStandard[]): Promise<void> {
  await db
    .insert(standardsTable)
    .values(rows)
    .onConflictDoUpdate({
      target: standardsTable.bisStandardId,
      set: {
        bisEncId: sql`excluded.bis_enc_id`,
        number: sql`excluded.number`,
        numberNormalized: sql`excluded.number_normalized`,
        series: sql`excluded.series`,
        editionYear: sql`excluded.edition_year`,
        title: sql`excluded.title`,
        typeOfStandard: sql`excluded.type_of_standard`,
        groupName: sql`excluded.group_name`,
        publishedOn: sql`excluded.published_on`,
        raw: sql`excluded.raw`,
        scrapedAt: sql`now()`,
        updatedAt: sql`now()`,
        embedding: sql`
          case
            when ${standardsTable.number} is distinct from excluded.number
              or ${standardsTable.title} is distinct from excluded.title
            then null
            else ${standardsTable.embedding}
          end
        `,
      },
    });
}
