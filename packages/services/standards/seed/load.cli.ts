/**
 * `pnpm db:seed` entrypoint — loads the hand-seeded demo catalogue into
 * `standards` and backfills embeddings.
 *
 * Embeddings need `OPENAI_API_KEY`; without it the catalogue is still loaded and
 * fully lexically searchable, and the seam tests use their own deterministic
 * embedder, so this is a warning, not a failure.
 */
import { defaultEmbeddingProvider } from "../../llm/embeddings";
import { embedDemoStandards } from "./embed";
import { loadDemoStandards } from "./load";

async function main() {
  const { upserted, pruned } = await loadDemoStandards();
  console.info(
    `✅ demo catalogue loaded — ${upserted} upserted, ${pruned} stale row(s) pruned`,
  );

  const provider = defaultEmbeddingProvider();
  if (!provider) {
    console.warn(
      "⚠️  OPENAI_API_KEY not set — skipped embeddings; semantic search will be empty",
    );
    return;
  }

  const { embedded } = await embedDemoStandards(provider);
  console.info(`✅ embeddings backfilled — ${embedded} standard(s)`);
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("❌ demo catalogue load failed");
    console.error(err);
    process.exit(1);
  });
