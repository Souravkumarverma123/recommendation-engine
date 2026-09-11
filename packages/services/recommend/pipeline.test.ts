import { beforeAll, describe, expect, it } from "vitest";

import { fakeEmbeddingProvider } from "../test/fake-embeddings";
import {
  fakeRecommendationReasoner,
  ScriptedRecommendationReasoner,
} from "../test/fake-reasoner";
import { freezeClock } from "../test/frozen-clock";
import { prepareDemoDatabase } from "../test/prepare-db";
import { QcoService } from "../qco";
import { regulatoryStatusSchema } from "../qco/model";
import { StandardsService } from "../standards";
import { RecommendService } from "./index";

freezeClock();
beforeAll(prepareDemoDatabase);

/**
 * Seam 1 — `recommend.run` (integration, docs/PRD.md §Testing Decisions).
 *
 * The highest seam: normalisation → hybrid retrieval → independent QCO check →
 * LLM reasoning (ranking, roles, evidence, gap warnings, draft clause) →
 * post-hoc verification → response assembly. OpenAI is faked twice over — the
 * deterministic concept embedder and the rule-based reasoner
 * (test/fake-reasoner.ts). The DB holds the hand-seeded demo catalogue + QCO
 * obligations. Assertions are on the returned structure only — not on call
 * order, SQL, prompt strings, or ranking internals. This is the template for
 * future pipeline tests.
 */

const recommend = new RecommendService({
  standards: new StandardsService({ embeddings: fakeEmbeddingProvider }),
  qco: new QcoService(),
  reasoner: fakeRecommendationReasoner,
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
      expect(regulatoryStatusSchema.options).toContain(result.regulatoryStatus);
    }
    // IS 269 is mandatory; IS 456 (a code of practice) is voluntary — both surface
    // for this query and must not get the same badge just because both matched.
    const opc = resultFor(output, "IS 269:2015");
    expect(opc?.regulatoryStatus).toBe("MANDATORY");
  });
});

describe("recommend.run — the LLM reasoning layer (ticket #10)", () => {
  it("returns a requirement summary, a role and a reason per result, and a draft clause", async () => {
    const output = await recommend.run({ specText: "500 ergonomic office chairs" });

    expect(output.reasoned).toBe(true);
    expect(output.requirementSummary).toBeTruthy();
    expect(output.draftClause).toBeTruthy();

    const chair = resultFor(output, "IS 17631:2022");
    expect(chair?.role).not.toBeNull();
    expect(chair?.reason).toBeTruthy();
  });

  it("the draft clause for a mandatory primary requires a BIS certification licence", async () => {
    const output = await recommend.run({ specText: "500 ergonomic office chairs" });
    expect(output.draftClause).toMatch(/IS 17631:2022/);
    expect(output.draftClause).toMatch(/licence|licens/i);
  });

  it("the draft clause for a voluntary code of practice asks only for conformity", async () => {
    const output = await recommend.run({ specText: "RCC structural work per IS 456" });
    expect(output.draftClause).toMatch(/IS 456:2000/);
    expect(output.draftClause).not.toMatch(/licence|certification mark/i);
  });

  it("evidence excerpts are verbatim substrings of the officer's input", async () => {
    const spec = "supply of hot rolled structural steel sections for building frames";
    const output = await recommend.run({ specText: spec });

    const withEvidence = output.results.filter((r) => r.evidence.length > 0);
    expect(withEvidence.length).toBeGreaterThan(0);
    for (const result of withEvidence) {
      for (const excerpt of result.evidence) {
        expect(spec.toLowerCase()).toContain(excerpt.toLowerCase());
      }
    }
  });

  it("flags a foreign standard cited where an Indian Standard exists", async () => {
    const output = await recommend.run({
      specText: "IT equipment safety per IEC 62368 for the secretariat",
    });
    const foreign = output.gapWarnings.find((w) => w.kind === "FOREIGN_STANDARD");
    expect(foreign).toBeDefined();
    expect(foreign?.evidence).toMatch(/IEC 62368/i);
  });

  it("flags a brand name in the draft specification", async () => {
    const output = await recommend.run({
      specText: "500 Godrej ergonomic office chairs",
    });
    expect(output.gapWarnings.some((w) => w.kind === "BRAND_NAME")).toBe(true);
  });

  it("drops a hallucinated designation that does not trace to a retrieved candidate", async () => {
    const scripted = new ScriptedRecommendationReasoner({
      requirementSummary: "Office seating.",
      rankedStandards: [
        { number: "IS 99999:2099", role: "PRIMARY", reason: "invented", evidence: [] },
        {
          number: "IS 17631:2022",
          role: "PRIMARY",
          reason: "real",
          evidence: ["office chairs"],
        },
      ],
      gapWarnings: [],
      draftClause: "The goods shall conform to IS 17631:2022.",
    });
    const guarded = new RecommendService({
      standards: new StandardsService({ embeddings: fakeEmbeddingProvider }),
      qco: new QcoService(),
      reasoner: scripted,
    });

    const output = await guarded.run({ specText: "500 ergonomic office chairs" });

    expect(resultFor(output, "IS 99999:2099")).toBeUndefined();
    expect(resultFor(output, "IS 17631:2022")).toBeDefined();
    expect(JSON.stringify(output)).not.toMatch(/99999/);
  });

  it("still answers when the reasoner is disabled — retrieval order, no reasoning fields", async () => {
    const bare = new RecommendService({
      standards: new StandardsService({ embeddings: fakeEmbeddingProvider }),
      qco: new QcoService(),
      reasoner: null,
    });

    const output = await bare.run({ specText: "500 ergonomic office chairs" });

    expect(output.reasoned).toBe(false);
    expect(output.requirementSummary).toBeNull();
    expect(output.draftClause).toBeNull();
    expect(output.gapWarnings).toEqual([]);
    const chair = resultFor(output, "IS 17631:2022");
    expect(chair).toBeDefined();
    expect(chair?.role).toBeNull();
    expect(chair?.regulatoryStatus).toBe("MANDATORY"); // independent check still runs
  });
});
