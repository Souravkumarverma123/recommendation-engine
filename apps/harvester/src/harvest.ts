/**
 * Orchestrates a full harvest run: catalogue upsert (recorded in `harvest_runs`)
 * followed by the title-level embedding backfill. This is what `pnpm harvest`
 * runs; the seam test drives it with a fake catalogue and the deterministic fake
 * embedder.
 */
import {
  defaultEmbeddingProvider,
  type EmbeddingProvider,
} from "@repo/services/llm/embeddings";

import { harvestCatalogue, type CatalogueSource, type HarvestCatalogueResult } from "./catalogue";
import { embedCatalogue } from "./embed-catalogue";
import { withHarvestRun } from "./harvest-run";

export interface RunHarvestOptions {
  client: CatalogueSource;
  /**
   * Embedding provider for the backfill. `undefined` uses the configured default
   * (OpenAI when `OPENAI_API_KEY` is set, `null` under Vitest); pass `null`
   * explicitly to skip embeddings, or a fake in tests.
   */
  embeddings?: EmbeddingProvider | null;
  catalogueBatchSize?: number;
  embedBatchSize?: number;
  pageSize?: number;
  /** Bound the run — stop after this many catalogue rows (and embed at most this many). */
  maxItems?: number;
  logger?: Pick<Console, "info" | "warn">;
}

export interface RunHarvestResult extends HarvestCatalogueResult {
  embedded: number;
}

export async function runHarvest(options: RunHarvestOptions): Promise<RunHarvestResult> {
  const log = options.logger ?? console;

  let catalogue!: HarvestCatalogueResult;
  await withHarvestRun("list", async () => {
    catalogue = await harvestCatalogue({
      client: options.client,
      batchSize: options.catalogueBatchSize,
      pageSize: options.pageSize,
      maxItems: options.maxItems,
      onProgress: (n) => log.info(`  … ${n} catalogue rows upserted`),
    });
    return {
      recordCount: catalogue.upserted,
      notes:
        `fetched ${catalogue.fetched}, upserted ${catalogue.upserted}, ` +
        `skipped ${catalogue.skipped} unparseable`,
    };
  });
  log.info(
    `catalogue harvest: ${catalogue.upserted} upserted, ${catalogue.skipped} skipped ` +
      `(of ${catalogue.fetched} fetched)`,
  );

  const provider =
    options.embeddings === undefined ? defaultEmbeddingProvider() : options.embeddings;

  let embedded = 0;
  if (provider) {
    ({ embedded } = await embedCatalogue({
      provider,
      batchSize: options.embedBatchSize,
      maxRows: options.maxItems,
      onProgress: (n) => log.info(`  … ${n} standards embedded`),
    }));
    log.info(`embedding backfill: ${embedded} standard(s) embedded`);
  } else {
    log.warn(
      "OPENAI_API_KEY not set — skipping the embedding backfill; semantic search " +
        "covers only rows already embedded (e.g. the demo seed)",
    );
  }

  return { ...catalogue, embedded };
}
