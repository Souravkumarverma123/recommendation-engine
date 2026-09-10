/**
 * `pnpm db:seed` entrypoint — loads the hand-seeded demo catalogue into
 * `standards`. Thin wrapper around `loadDemoStandards()` so the logic stays
 * importable and testable.
 */
import { loadDemoStandards } from "./load";

loadDemoStandards()
  .then(({ inserted }) => {
    console.info(`✅ demo catalogue loaded — ${inserted} standards upserted`);
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("❌ demo catalogue load failed");
    console.error(err);
    process.exit(1);
  });
