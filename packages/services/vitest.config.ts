import { mergeConfig } from "vitest/config";
import { baseConfig } from "@repo/vitest-config/base";

// Package-specific Vitest overrides go here (e.g. setup files, env, coverage).
// DB-backed suites (e.g. the `standards.search` seam) bootstrap Postgres
// themselves in `beforeAll` so pure-logic suites stay infra-free.
export default mergeConfig(baseConfig, {});
