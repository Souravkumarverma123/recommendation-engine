import { mergeConfig } from "vitest/config";
import { baseConfig } from "@repo/vitest-config/base";

// Package-specific Vitest overrides.
//
// DB-backed suites (the `standards.search` / hybrid-search / `qco.checkStatus` /
// `recommend.run` seams) bootstrap Postgres themselves in `beforeAll` so
// pure-logic suites stay infra-free. They all migrate + seed the same database,
// so test files must run one at a time — otherwise two suites race on the
// migration and seed steps. Pure suites are tiny; the serial cost is a second.
export default mergeConfig(baseConfig, {
  test: {
    fileParallelism: false,
  },
});
