/**
 * `pnpm --filter @repo/harvester harvest` — the operator entrypoint.
 *
 * Populates `standards` from the live BIS catalogue API and backfills title-level
 * embeddings. One command, ~24k rows, ~242 paged requests at ~1.6 req/s.
 *
 *   pnpm --filter @repo/harvester harvest              # whole catalogue
 *   pnpm --filter @repo/harvester harvest --limit 200  # bounded smoke run
 *
 * Needs `DATABASE_URL`; `OPENAI_API_KEY` is optional (without it the catalogue is
 * still loaded and lexically searchable, embeddings are skipped). Run the demo
 * seed afterwards (`pnpm db:seed`) to top up the demo slice's detail fields, then
 * `pnpm --filter @repo/harvester harvest:details` (src/details-main.ts) for the
 * demo slice's full metadata, amendments and cross-reference graph.
 */
import { logger } from "@repo/logger";
import { BisClient } from "@repo/services/bis/client";
import { env } from "@repo/services/env";
import { OpenAIEmbeddingProvider } from "@repo/services/llm/embeddings";

import { runHarvest } from "./harvest";

function parseLimit(argv: string[]): number | undefined {
  const eq = argv.find((a) => a.startsWith("--limit="));
  if (eq) return toPositiveInt(eq.slice("--limit=".length));
  const flag = argv.indexOf("--limit");
  if (flag !== -1) return toPositiveInt(argv[flag + 1]);
  return undefined;
}

function toPositiveInt(value: string | undefined): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

async function main() {
  const maxItems = parseLimit(process.argv.slice(2));
  const client = new BisClient({ baseUrl: env.BIS_API_BASE });
  const embeddings = env.OPENAI_API_KEY
    ? new OpenAIEmbeddingProvider(env.OPENAI_API_KEY)
    : null;

  logger.info(
    maxItems
      ? `BIS catalogue harvest starting (bounded to ${maxItems} rows)…`
      : "BIS full-catalogue harvest starting…",
  );

  const result = await runHarvest({ client, embeddings, maxItems, logger });

  logger.info("harvest complete", result);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    logger.error("harvest failed", { error });
    process.exit(1);
  });
