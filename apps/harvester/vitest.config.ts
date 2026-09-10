import { mergeConfig } from "vitest/config";
import { baseConfig } from "@repo/vitest-config/base";

// The catalogue-harvest seam test bootstraps Postgres in `beforeAll` (migrations +
// the demo seed, same as the `@repo/services` seams). It runs after those via the
// Turborepo `^test` dependency edge — `@repo/harvester` depends on `@repo/services`
// — so the two packages never race on the shared `dev` database. Within this
// package, keep files serial for the same reason the services package does.
export default mergeConfig(baseConfig, {
  test: {
    fileParallelism: false,
  },
});
