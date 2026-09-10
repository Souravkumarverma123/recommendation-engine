import { beforeAll, describe, expect, it } from "vitest";

import { fakeEmbeddingProvider } from "../test/fake-embeddings";
import { prepareDemoDatabase } from "../test/prepare-db";
import { QcoService } from "../qco";
import { StandardsService } from "../standards";
import { RecommendService } from "./index";

beforeAll(prepareDemoDatabase);

/**
 * Seam 1 — `recommend.run` (integration, docs/PRD.md §Testing Decisions).
 *
 * The highest seam: normalisation → hybrid retrieval → independent QCO check →
 * response assembly. OpenAI is the deterministic fake embedder; the DB holds the
 * hand-seeded demo catalogue + QCO obligations. Assertions cover the two demo
 * scenarios and are on the returned structure only — not on call order, SQL, or
 * ranking internals. This is the template for future pipeline tests.
 */

const recommend = new RecommendService({
  standards: new StandardsService({ embeddings: fakeEmbeddingProvider }),
  qco: new QcoService(),
});

function resultFor(output: Awaited<ReturnType<RecommendService["run"]>>, number: string) {
  return output.results.find((r) => r.number === number);
}

describe("recommend.run — ranked standards with an independent regulatory badge", () => {
  it("scenario 1 — office chairs come back MANDATORY with the QCO citation", async () => {
    const output = await recommend.run({ specText: "500 ergonomic office chairs" });

    const chair = resultFor(output, "IS 17631:2022");
    expect(chair).toBeDefined();
    expect(chair?.regulatoryStatus).toBe("MANDATORY");
    expect(chair?.qco?.soNumbers).toContain("S.O. 801(E)");
    expect(chair?.qco?.enforcementDate).toBe("2026-08-14");
  });

  it("scenario 2 — an IS 456 concrete spec comes back VOLUNTARY, no ISI-mark language", async () => {
    const output = await recommend.run({ specText: "RCC structural work per IS 456" });

    const concrete = resultFor(output, "IS 456:2000");
    expect(concrete).toBeDefined();
    expect(concrete?.regulatoryStatus).toBe("VOLUNTARY");
    expect(concrete?.qco).toBeNull();

    // No result may carry mandatory-certification wording for this spec.
    expect(JSON.stringify(output)).not.toMatch(/ISI mark|standard mark of bis/i);
  });

  it("echoes the requested language and the query", async () => {
    const output = await recommend.run({ specText: "hot rolled structural steel", language: "hi" });
    expect(output.language).toBe("hi");
    expect(output.query).toBe("hot rolled structural steel");
  });

  it("badges every result from the independent check, not from retrieval rank", async () => {
    const output = await recommend.run({ specText: "portland cement for concrete" });
    expect(output.results.length).toBeGreaterThan(0);
    for (const result of output.results) {
      expect(["MANDATORY", "UPCOMING", "VOLUNTARY", "NEEDS_REVIEW"]).toContain(
        result.regulatoryStatus,
      );
    }
    // IS 269 is mandatory; IS 456 (a code of practice) is voluntary — both surface
    // for this query and must not get the same badge just because both matched.
    const opc = resultFor(output, "IS 269:2015");
    expect(opc?.regulatoryStatus).toBe("MANDATORY");
  });
});
