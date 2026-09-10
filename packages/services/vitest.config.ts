import { mergeConfig } from "vitest/config";
import { baseConfig } from "@repo/vitest-config/base";

// The `standards.search` seam runs against a real Postgres; global setup applies
// migrations and seeds the demo catalogue once per run (see test/global-setup.ts).
export default mergeConfig(baseConfig, {
  test: {
    globalSetup: ["./test/global-setup.ts"],
  },
});
