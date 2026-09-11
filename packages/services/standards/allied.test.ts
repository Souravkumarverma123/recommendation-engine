import { describe, expect, it } from "vitest";

import { classifyAlliedRole, resolveAlliedRole } from "./allied";

/**
 * Pure unit — the allied-role classifier (ticket #11, docs/PRD.md user story 19).
 *
 * A table of real BIS titles → the role a procurement officer would file the
 * standard under. The classifier is the fallback the build-approach doc calls
 * for: the BIS cross-ref API does not sub-type its references, so the role is
 * read off the neighbour's own title and type.
 */
describe("classifyAlliedRole", () => {
  it.each([
    ["IS 516 (Part 1/Sec 1) : 2021", "Hardened Concrete — Methods of Test", "TEST_METHOD"],
    ["IS 1199 (Part 1) : 2018", "Fresh Concrete — Methods of Sampling and Testing", "TEST_METHOD"],
    ["IS 383 : 2016", "Coarse and Fine Aggregate for Concrete — Specification", "NORMATIVE_REFERENCE"],
    ["IS 269 : 2015", "Ordinary Portland Cement — Specification", "NORMATIVE_REFERENCE"],
    ["IS 800 : 2007", "General Construction in Steel — Code of Practice", "NORMATIVE_REFERENCE"],
    ["IS 4353 : 1995", "Recommendations for Submerged Arc Welding — Safety", "SAFETY"],
    ["IS 13311 (Part 1) : 1992", "Non-destructive Testing of Concrete — Methods of Test", "TEST_METHOD"],
    ["IS 4845 : 1968", "Definitions and Terminology Relating to Hydraulic Cement", "TERMINOLOGY"],
    ["IS 816 : 1969", "Code of Practice for Use of Metal Arc Welding for General Construction", "INSTALLATION"],
    ["IS 3764 : 1992", "Excavation Work — Code of Safety", "SAFETY"],
  ])("%s (%s) → %s", (_number, title, expected) => {
    expect(classifyAlliedRole({ title })).toBe(expected);
  });

  it("uses the standard type as a secondary signal", () => {
    expect(
      classifyAlliedRole({ title: "IS 9103 concrete admixtures", typeOfStandard: "Methods of Test" }),
    ).toBe("TEST_METHOD");
  });
});

describe("resolveAlliedRole", () => {
  const dst = { title: "Coarse and Fine Aggregate for Concrete — Specification" };

  it("prefers a valid curated props.role over the classifier", () => {
    expect(resolveAlliedRole({ role: "SAFETY" }, dst)).toBe("SAFETY");
  });

  it("falls back to the classifier when props has no usable role", () => {
    expect(resolveAlliedRole(null, dst)).toBe("NORMATIVE_REFERENCE");
    expect(resolveAlliedRole({ role: "NONSENSE" }, dst)).toBe("NORMATIVE_REFERENCE");
    expect(resolveAlliedRole({ note: "curated" }, dst)).toBe("NORMATIVE_REFERENCE");
  });
});
