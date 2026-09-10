import { describe, expect, it } from "vitest";

import { StandardsService } from "./index";
import { standardSearchHitSchema } from "./model";

/**
 * Seam — `standards.search` (integration, PRD §Testing Decisions / ticket #6).
 *
 * Runs against a real Postgres seeded with the hand-reviewed demo catalogue
 * (test/global-setup.ts). Assertions are on observable output — which
 * designations come back, in what order, with what lifecycle status — never on
 * the SQL, the ranking function, or how retrieval is wired internally. This is
 * the template for the hybrid-search and pipeline seams that build on it.
 */

const service = new StandardsService();

function numbersFor(query: string, limit?: number) {
  return service
    .search(limit == null ? { query } : { query, limit })
    .then((r) => r.results.map((hit) => hit.number));
}

describe("standards.search — lexical retrieval over the demo catalogue", () => {
  it("returns IS 456:2000 for a plain-language concrete query", async () => {
    expect(await numbersFor("reinforced concrete")).toContain("IS 456:2000");
  });

  it.each([
    ["ergonomic office chairs", "IS 17631:2022"],
    ["helmet for two wheeler riders", "IS 4151:2015"],
    ["hot rolled structural steel sections", "IS 2062:2011"],
    ["ordinary portland cement 43 grade", "IS 8112:2013"],
    ["laptop power adapter safety", "IS/IEC 62368-1:2023"],
  ])("surfaces %j → %s", async (query, expected) => {
    expect(await numbersFor(query)).toContain(expected);
  });

  it("matches on the designation itself", async () => {
    expect(await numbersFor("IS 800")).toContain("IS 800:2007");
  });

  it("ranks the closest title match first", async () => {
    const results = await numbersFor("plain and reinforced concrete code of practice");
    expect(results[0]).toBe("IS 456:2000");
  });

  it("returns designation, title and lifecycle status on every hit", async () => {
    const { results } = await service.search({ query: "concrete" });
    expect(results.length).toBeGreaterThan(0);
    for (const hit of results) {
      expect(() => standardSearchHitSchema.parse(hit)).not.toThrow();
    }
  });

  it("reports the lifecycle status of a withdrawn standard", async () => {
    const { results } = await service.search({ query: "53 grade ordinary portland cement" });
    const withdrawn = results.find((hit) => hit.number === "IS 12269:2013");
    expect(withdrawn?.lifecycleStatus).toBe("WITHDRAWN");
  });

  it("marks a current standard ACTIVE", async () => {
    const { results } = await service.search({ query: "reinforced concrete" });
    const active = results.find((hit) => hit.number === "IS 456:2000");
    expect(active?.lifecycleStatus).toBe("ACTIVE");
  });

  it("respects the requested limit", async () => {
    const { results } = await service.search({ query: "steel concrete cement furniture", limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("returns an empty list when nothing matches", async () => {
    const { results } = await service.search({ query: "xyzzy plugh frobnicate" });
    expect(results).toEqual([]);
  });

  it("returns an empty list for a query with no searchable terms", async () => {
    const { results } = await service.search({ query: "the of and to" });
    expect(results).toEqual([]);
  });

  it("rejects an empty query at the contract boundary", async () => {
    await expect(service.search({ query: "   " })).rejects.toThrow();
  });
});
