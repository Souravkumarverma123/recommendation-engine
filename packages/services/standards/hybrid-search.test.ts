import { beforeAll, describe, expect, it } from "vitest";

import { fakeEmbeddingProvider } from "../test/fake-embeddings";
import { prepareDemoDatabase } from "../test/prepare-db";
import { StandardsService } from "./index";

beforeAll(prepareDemoDatabase);

/**
 * Seam — `standards.search` semantic half + RRF fusion (integration, ticket #7).
 *
 * Runs against real Postgres + pgvector, with the demo catalogue embedded by the
 * deterministic fake provider (test/prepare-db.ts). Assertions are on observable
 * output — which designations a meaning-based query surfaces — never on the
 * cosine SQL, the RRF constant, or how the two lists are merged. Builds on the
 * lexical seam in search.test.ts, which still passes now that it runs through
 * fusion.
 */

const hybrid = new StandardsService({ embeddings: fakeEmbeddingProvider });
const lexicalOnly = new StandardsService({ embeddings: null });

function numbersFor(service: StandardsService, query: string) {
  return service.search({ query }).then((r) => r.results.map((h) => h.number));
}

describe("standards.search — hybrid semantic + lexical retrieval", () => {
  it("surfaces a load-bearing structural query with no shared title keyword", async () => {
    // "load-bearing structural frame material" shares no word with the IS 800
    // title ("General Construction in Steel — Code of Practice").
    const results = await numbersFor(hybrid, "load-bearing structural frame material");
    expect(results).toContain("IS 800:2007");
  });

  it("finds office seating from a description the lexical index misses", async () => {
    const query = "comfortable seating for a workplace";

    // The lexical index returns nothing — none of these lexemes are in the
    // catalogue text.
    expect(await lexicalOnly.search({ query })).toEqual({ results: [] });

    // The semantic list still connects "seating"/"workplace" to office chairs.
    expect(await numbersFor(hybrid, query)).toContain("IS 17631:2022");
  });

  it("still answers a plain keyword query (previous slice unbroken)", async () => {
    expect(await numbersFor(hybrid, "reinforced concrete")).toContain("IS 456:2000");
  });

  it("ranks an exact title match top even with the semantic list fused in", async () => {
    const results = await numbersFor(
      hybrid,
      "plain and reinforced concrete code of practice",
    );
    expect(results[0]).toBe("IS 456:2000");
  });

  it("returns nothing for a query with neither keyword nor concept signal", async () => {
    expect(await hybrid.search({ query: "xyzzy plugh frobnicate" })).toEqual({
      results: [],
    });
  });

  it("degrades to lexical-only when embeddings are disabled", async () => {
    const results = await numbersFor(lexicalOnly, "reinforced concrete");
    expect(results).toContain("IS 456:2000");
  });
});
