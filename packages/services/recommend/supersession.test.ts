import { describe, expect, it } from "vitest";

import { mergeGapWarnings, supersessionWarnings } from "./supersession";

/**
 * Pure unit — deterministic supersession gap warnings (ticket #12,
 * docs/PRD.md user story 8). Mirrors verify.test.ts's style for the sibling
 * "verbatim from the officer's own input" rule.
 */
describe("supersessionWarnings", () => {
  it("warns naming the successor when the withdrawn number is cited verbatim", () => {
    const warnings = supersessionWarnings(
      [{ number: "IS 269:2015", supersedes: ["IS 8112:2013"] }],
      "OPC 43 grade to IS 8112",
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      kind: "SUPERSEDED_CITATION",
      evidence: "IS 8112",
    });
    expect(warnings[0]?.message).toMatch(/IS 8112/);
    expect(warnings[0]?.message).toMatch(/IS 269:2015/);
  });

  it("emits nothing when the withdrawn number was never cited in the input", () => {
    const warnings = supersessionWarnings(
      [{ number: "IS 269:2015", supersedes: ["IS 8112:2013"] }],
      "ordinary portland cement for concrete works",
    );
    expect(warnings).toEqual([]);
  });

  it("emits nothing when resolution needed no supersession", () => {
    const warnings = supersessionWarnings(
      [{ number: "IS 456:2000", supersedes: [] }],
      "RCC structural work per IS 456",
    );
    expect(warnings).toEqual([]);
  });

  it("warns once per absorbed designation across a multi-hop chain", () => {
    const warnings = supersessionWarnings(
      [{ number: "IS 3000:2020", supersedes: ["IS 1000:1990", "IS 2000:2005"] }],
      "conforming to IS 1000 and IS 2000",
    );
    expect(warnings.map((w) => w.evidence)).toEqual(["IS 1000", "IS 2000"]);
  });

  it("does not claim a different explicit edition year is the superseded one", () => {
    const warnings = supersessionWarnings(
      [{ number: "IS 269:2015", supersedes: ["IS 8112:2013"] }],
      "OPC 43 grade to IS 8112:1990",
    );
    expect(warnings).toEqual([]);
  });

  it("still matches when the citation gives no year at all", () => {
    const warnings = supersessionWarnings(
      [{ number: "IS 269:2015", supersedes: ["IS 8112:2013"] }],
      "OPC 43 grade to IS 8112",
    );
    expect(warnings).toHaveLength(1);
  });

  it("catches a spaced-slash composite series citation, not just the unspaced form", () => {
    const warnings = supersessionWarnings(
      [{ number: "IS/IEC 62368-1:2023", supersedes: ["IS/IEC 60950-1:2013"] }],
      "IT equipment safety per IS / IEC 60950-1",
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.evidence).toMatch(/IS\s*\/\s*IEC/i);
  });

  it("catches a part-designation citation given with a hyphen inside the parenthetical", () => {
    const warnings = supersessionWarnings(
      [{ number: "IS 2000 (Part 4):2010", supersedes: ["IS 2000 (Part-3):1995"] }],
      "conforming to IS 2000 (Part-3)",
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.evidence).toBe("IS 2000 (Part-3)");
  });
});

describe("mergeGapWarnings", () => {
  it("keeps the deterministic warning and drops a model duplicate for the same evidence", () => {
    const merged = mergeGapWarnings(
      [
        {
          kind: "SUPERSEDED_CITATION",
          message: "authoritative message",
          evidence: "IS 8112",
        },
      ],
      [
        { kind: "SUPERSEDED_CITATION", message: "model guess", evidence: "IS 8112" },
        { kind: "BRAND_NAME", message: "brand", evidence: "Godrej" },
      ],
    );

    expect(merged).toHaveLength(2);
    expect(merged[0]?.message).toBe("authoritative message");
    expect(merged.some((w) => w.kind === "BRAND_NAME")).toBe(true);
  });

  it("dedupes a model-proposed duplicate that quotes the citation with a different edition year", () => {
    const merged = mergeGapWarnings(
      [{ kind: "SUPERSEDED_CITATION", message: "authoritative", evidence: "IS 8112" }],
      [{ kind: "SUPERSEDED_CITATION", message: "model guess", evidence: "IS 8112:2013" }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.message).toBe("authoritative");
  });

  it("passes through model warnings unchanged when there is nothing deterministic", () => {
    const modelWarnings = [
      { kind: "NON_METRIC_UNIT" as const, message: "m", evidence: "5 inch" },
    ];
    expect(mergeGapWarnings([], modelWarnings)).toEqual(modelWarnings);
  });
});
