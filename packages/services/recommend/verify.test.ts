import { describe, expect, it } from "vitest";

import { traceToCandidate, verbatimExcerpts } from "./verify";

/**
 * Pure-logic tests for the post-hoc verification helpers (docs/PRD.md §Pipeline
 * step 8). No DB, no network — the table-driven style of the `parseDesignation`
 * seam (docs/PRD.md §Testing Decisions).
 */

describe("verbatimExcerpts — keep only what the model lifted from the input", () => {
  const spec = "Supply of 500 ergonomic office chairs with adjustable lumbar support.";

  it("keeps an exact substring", () => {
    expect(verbatimExcerpts(["ergonomic office chairs"], spec)).toEqual([
      "ergonomic office chairs",
    ]);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(verbatimExcerpts(["  Ergonomic   Office  Chairs "], spec)).toEqual([
      "Ergonomic   Office  Chairs",
    ]);
  });

  it("drops a paraphrase that is not actually in the input", () => {
    expect(verbatimExcerpts(["swivel task seating"], spec)).toEqual([]);
  });

  it("drops blanks and de-duplicates", () => {
    expect(verbatimExcerpts(["", "office chairs", "office chairs", "  "], spec)).toEqual([
      "office chairs",
    ]);
  });
});

describe("traceToCandidate — a designation must trace back to a retrieved candidate", () => {
  const candidates = [
    { number: "IS 17631:2022", note: "chairs" },
    { number: "IS 456:2000", note: "concrete" },
  ];

  it("matches across designation formatting differences", () => {
    expect(traceToCandidate("IS 17631 : 2022", candidates)?.note).toBe("chairs");
    expect(traceToCandidate("is17631", candidates)?.note).toBe("chairs");
  });

  it("returns null for a standard that was never a candidate", () => {
    expect(traceToCandidate("IS 99999:2099", candidates)).toBeNull();
  });

  it("returns null for an unparseable string", () => {
    expect(traceToCandidate("not a designation", candidates)).toBeNull();
  });
});
