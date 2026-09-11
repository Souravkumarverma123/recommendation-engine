/**
 * `pnpm db:seed` entrypoint — loads the whole hand-seeded demo dataset:
 * the catalogue, its embeddings, and the QCO obligations.
 *
 * Embeddings need `OPENAI_API_KEY`; without it the catalogue is still loaded and
 * fully lexically searchable, and the seam tests use their own deterministic
 * embedder, so a missing key is a warning, not a failure.
 */
import { loadDemoQcos } from "../../qco/seed/load";
import { defaultEmbeddingProvider } from "../../llm/embeddings";
import { embedDemoStandards } from "./embed";
import { loadDemoEdges } from "./edges";
import { loadDemoStandards } from "./load";

async function main() {
  const { upserted, pruned, toppedUp } = await loadDemoStandards();
  console.info(
    `✅ demo catalogue loaded — ${upserted} reviewed row(s): ${toppedUp} topped up on ` +
      `harvested records, ${upserted - toppedUp} seeded in the demo band, ${pruned} stale ` +
      `row(s) pruned`,
  );

  const edges = await loadDemoEdges();
  console.info(
    `✅ allied-standards graph loaded — ${edges.edges} edge(s), ${edges.companions} ` +
      `companion row(s), ${edges.pruned} stale row(s) pruned`,
  );

  const provider = defaultEmbeddingProvider();
  if (provider) {
    const { embedded } = await embedDemoStandards(provider);
    console.info(`✅ embeddings backfilled — ${embedded} standard(s)`);
  } else {
    console.warn(
      "⚠️  OPENAI_API_KEY not set — embeddings cleared (not stale); semantic " +
        "search is disabled until you reseed with a key",
    );
  }

  const { qcos, obligations } = await loadDemoQcos();
  console.info(`✅ QCO layer loaded — ${qcos} orders, ${obligations} obligations`);
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("❌ demo catalogue load failed");
    console.error(err);
    process.exit(1);
  });
