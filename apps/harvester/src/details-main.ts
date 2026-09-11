/**
 * `pnpm --filter @repo/harvester harvest:details` — the operator entrypoint for
 * the demo-slice detail + relationship harvest (ticket #11, user story 31).
 *
 * Run it AFTER `pnpm harvest` (which loads the catalogue and, with it, the
 * `bisEncId` every detail call needs) and `pnpm db:seed`. It pulls
 * `getWebsiteStandardDetails`, `getAmendmentDetails` and `getCrossRefDetails`
 * for the ~15 demo standards and lands the detail columns, `amendments` and the
 * `standard_edges` relationship graph.
 *
 *   pnpm --filter @repo/harvester harvest:details
 *
 * Needs `DATABASE_URL`. No `OPENAI_API_KEY` — this step does not embed.
 */
import { logger } from "@repo/logger";
import { BisClient } from "@repo/services/bis/client";
import { env } from "@repo/services/env";

import { harvestDetails } from "./details";

async function main() {
  const client = new BisClient({ baseUrl: env.BIS_API_BASE });
  logger.info("BIS demo-slice detail harvest starting…");
  const result = await harvestDetails({ client, logger });
  logger.info("detail harvest complete", result);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    logger.error("detail harvest failed", { error });
    process.exit(1);
  });
