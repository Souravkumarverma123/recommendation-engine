import { defineConfig } from "vitest/config";

/**
 * Shared Vitest configuration for every workspace.
 *
 * Per-package `vitest.config.ts` files merge this via `mergeConfig`. This is the
 * template all future test setups extend (see docs/PRD.md §Testing Decisions).
 */
export const baseConfig = defineConfig({
  test: {
    // Packages without a suite yet must still exit 0 so `turbo run test` is green.
    passWithNoTests: true,
    include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.turbo/**"],
    clearMocks: true,
  },
});
