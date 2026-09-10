import { mergeConfig } from "vitest/config";
import { baseConfig } from "@repo/vitest-config/base";

// Package-specific Vitest overrides go here (e.g. setup files, env, coverage).
export default mergeConfig(baseConfig, {});
