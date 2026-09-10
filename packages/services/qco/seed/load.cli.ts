/**
 * `pnpm db:seed:qco` entrypoint — loads the hand-seeded QCO obligations.
 * Thin wrapper around `loadDemoQcos()` so the logic stays importable and
 * testable. Run `db:seed` (standards) first so obligation → standard FKs resolve.
 */
import { loadDemoQcos } from "./load";

loadDemoQcos()
  .then(({ qcos, obligations }) => {
    console.info(`✅ QCO layer loaded — ${qcos} orders, ${obligations} obligations`);
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("❌ QCO load failed");
    console.error(err);
    process.exit(1);
  });
