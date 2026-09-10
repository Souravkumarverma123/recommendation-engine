import { describe, expect, it } from "vitest";

/**
 * Harness smoke test (ticket #3). Proves Vitest runs per-package through the
 * Turborepo `test` task. Replace/expand with the real seams:
 *   - `parseDesignation` pure unit table (ticket #5)
 *   - `recommend.run` integration (ticket #8)
 * See docs/PRD.md §Testing Decisions.
 */
describe("test harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
