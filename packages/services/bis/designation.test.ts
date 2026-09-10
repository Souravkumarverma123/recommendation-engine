import { describe, expect, it } from "vitest";

import {
  normalizeDesignation,
  normalizeDesignationWithYear,
  parseDesignation,
  sameStandard,
} from "./designation";

/**
 * Seam 2 — `parseDesignation` pure unit table (PRD §Testing Decisions, ticket #5).
 *
 * A table of real messy designation strings — as written in tender text,
 * catalogue rows, and QCO tables — mapped to the structured fields and canonical
 * keys they must resolve to. This suite is the template for all future
 * pure-logic tests: every input is a real observable string, every expectation
 * is on the returned value, nothing asserts internals.
 */

interface ParseExpectation {
  raw: string;
  series: string;
  number: string;
  part: number | null;
  section: number | null;
  year: number | null;
  key: string;
  keyWithYear: string;
  canonical: string;
}

/** The canonical table from PRD §Seam 2, plus the equivalence forms it names. */
const TABLE: ParseExpectation[] = [
  {
    raw: "IS 456:2000",
    series: "IS",
    number: "456",
    part: null,
    section: null,
    year: 2000,
    key: "is:456",
    keyWithYear: "is:456:2000",
    canonical: "IS 456 : 2000",
  },
  {
    raw: "IS 456 : 2000",
    series: "IS",
    number: "456",
    part: null,
    section: null,
    year: 2000,
    key: "is:456",
    keyWithYear: "is:456:2000",
    canonical: "IS 456 : 2000",
  },
  {
    raw: "IS 1489 (Part 1) : 1991",
    series: "IS",
    number: "1489",
    part: 1,
    section: null,
    year: 1991,
    key: "is:1489:p1",
    keyWithYear: "is:1489:p1:1991",
    canonical: "IS 1489 (Part 1) : 1991",
  },
  {
    raw: "IS 1489 : PART 1 : 1991",
    series: "IS",
    number: "1489",
    part: 1,
    section: null,
    year: 1991,
    key: "is:1489:p1",
    keyWithYear: "is:1489:p1:1991",
    canonical: "IS 1489 (Part 1) : 1991",
  },
  {
    raw: "IS 516 (Part-5/Sec-1) : 2018",
    series: "IS",
    number: "516",
    part: 5,
    section: 1,
    year: 2018,
    key: "is:516:p5:s1",
    keyWithYear: "is:516:p5:s1:2018",
    canonical: "IS 516 (Part 5/Sec 1) : 2018",
  },
  {
    raw: "IS 516 : Part 5 : Sec 1 : 2018",
    series: "IS",
    number: "516",
    part: 5,
    section: 1,
    year: 2018,
    key: "is:516:p5:s1",
    keyWithYear: "is:516:p5:s1:2018",
    canonical: "IS 516 (Part 5/Sec 1) : 2018",
  },
  {
    raw: "10322 (Part 5/Sec 1)",
    series: "IS",
    number: "10322",
    part: 5,
    section: 1,
    year: null,
    key: "is:10322:p5:s1",
    keyWithYear: "is:10322:p5:s1",
    canonical: "IS 10322 (Part 5/Sec 1)",
  },
  {
    raw: "IS/IEC 60947 : Part 5 : Sec 1 : 2024",
    series: "IS/IEC",
    number: "60947",
    part: 5,
    section: 1,
    year: 2024,
    key: "is-iec:60947:p5:s1",
    keyWithYear: "is-iec:60947:p5:s1:2024",
    canonical: "IS/IEC 60947 (Part 5/Sec 1) : 2024",
  },
  {
    raw: "IS/ISO 9001 : 2015",
    series: "IS/ISO",
    number: "9001",
    part: null,
    section: null,
    year: 2015,
    key: "is-iso:9001",
    keyWithYear: "is-iso:9001:2015",
    canonical: "IS/ISO 9001 : 2015",
  },
  {
    raw: "SP 6 : Part 7",
    series: "SP",
    number: "6",
    part: 7,
    section: null,
    year: null,
    key: "sp:6:p7",
    keyWithYear: "sp:6:p7",
    canonical: "SP 6 (Part 7)",
  },
  {
    raw: "IS 8112",
    series: "IS",
    number: "8112",
    part: null,
    section: null,
    year: null,
    key: "is:8112",
    keyWithYear: "is:8112",
    canonical: "IS 8112",
  },
];

describe("parseDesignation — PRD §Seam 2 table", () => {
  // One row = one expectation on the whole returned value (PRD §Testing
  // Decisions: "a table of real messy inputs → expected canonical keys /
  // structured fields"). The row label gives the failure its locality.
  it.each(TABLE)("$raw", ({ raw, ...expected }) => {
    expect(parseDesignation(raw)).toEqual(expected);
  });
});

describe("parseDesignation — unparseable strings return null", () => {
  const UNPARSEABLE = [
    "",
    "   \t ", // whitespace only, mixed spaces and tab
    "\u00a0\u00a0", // non-breaking spaces only
    "N/A",
    "see tender document",
    "As per relevant Indian Standard",
    "\u2014", // an em dash standing in for "no value"
    "IS", // series with no number
    "Part 3", // a part marker with no standard number
  ];

  for (const raw of UNPARSEABLE) {
    it(`"${raw}" -> null`, () => {
      expect(parseDesignation(raw)).toBeNull();
    });
  }

  it("non-string input -> null", () => {
    // Tender/catalogue rows are not always clean strings.
    expect(parseDesignation(undefined as unknown as string)).toBeNull();
    expect(parseDesignation(null as unknown as string)).toBeNull();
    expect(parseDesignation(123 as unknown as string)).toBeNull();
  });
});

describe("parseDesignation — series branch coverage", () => {
  it("defaults to IS when there is no series prefix", () => {
    expect(parseDesignation("456 : 2000")?.series).toBe("IS");
  });

  it("is case-insensitive on the series prefix", () => {
    expect(parseDesignation("is 456:2000")?.series).toBe("IS");
    expect(parseDesignation("is/iso 9001 : 2015")?.series).toBe("IS/ISO");
  });

  it("resolves the three-token IS/ISO/IEC series", () => {
    const parsed = parseDesignation("IS/ISO/IEC 17025 : 2017");
    expect(parsed?.series).toBe("IS/ISO/IEC");
    expect(parsed?.number).toBe("17025");
    expect(parsed?.key).toBe("is-iso-iec:17025");
  });

  it("does not treat a bare IS-prefixed word as a series-only match", () => {
    // "ISI mark" must not parse as series IS, number-less.
    expect(parseDesignation("ISI mark required")).toBeNull();
  });

  it("tolerates spacing around the slash in a compound series", () => {
    expect(parseDesignation("IS / IEC 60947 : 2024")?.series).toBe("IS/IEC");
  });

  it("matches a series glued to its number", () => {
    expect(parseDesignation("IS456:2000")?.key).toBe("is:456");
    expect(parseDesignation("SP6")?.key).toBe("sp:6");
  });

  it("does not coerce another body's standard into IS", () => {
    // An alien alpha prefix before the number => not an Indian Standard.
    expect(parseDesignation("BS 123")).toBeNull();
    expect(parseDesignation("EN 10025 : 2004")).toBeNull();
    expect(parseDesignation("ASTM A615")).toBeNull();
    expect(parseDesignation("conforming to 456:2000")).toBeNull();
  });
});

describe("parseDesignation — part / section branch coverage", () => {
  it("handles a part with no section", () => {
    const parsed = parseDesignation("IS 1489 (Part 1) : 1991");
    expect(parsed?.part).toBe(1);
    expect(parsed?.section).toBeNull();
  });

  it("handles both part and section", () => {
    const parsed = parseDesignation("IS 516 (Part-5/Sec-1) : 2018");
    expect(parsed?.part).toBe(5);
    expect(parsed?.section).toBe(1);
  });

  it("accepts the spelled-out 'Section' keyword", () => {
    const parsed = parseDesignation("IS 516 (Part 5/Section 1) : 2018");
    expect(parsed?.part).toBe(5);
    expect(parsed?.section).toBe(1);
  });

  it("leaves part and section null when absent", () => {
    const parsed = parseDesignation("IS 456:2000");
    expect(parsed?.part).toBeNull();
    expect(parsed?.section).toBeNull();
  });

  it("ignores a section with no part so key and canonical agree", () => {
    const parsed = parseDesignation("IS 516 : Sec 1 : 2018");
    expect(parsed?.part).toBeNull();
    expect(parsed?.section).toBeNull();
    expect(parsed?.key).toBe("is:516");
    expect(parsed?.canonical).toBe("IS 516 : 2018");
  });
});

describe("parseDesignation — year branch coverage", () => {
  it("keyWithYear falls back to key when there is no year", () => {
    const parsed = parseDesignation("IS 8112");
    expect(parsed?.year).toBeNull();
    expect(parsed?.keyWithYear).toBe(parsed?.key);
  });

  it("does not mistake a year-shaped standard number for the year", () => {
    const parsed = parseDesignation("IS 2062 : 2011");
    expect(parsed?.number).toBe("2062");
    expect(parsed?.year).toBe(2011);
  });

  it("does not invent a year from a part or section number", () => {
    const parsed = parseDesignation("IS 1489 : Part 1");
    expect(parsed?.year).toBeNull();
  });
});

describe("parseDesignation — formatting normalisation", () => {
  it("collapses non-breaking spaces and irregular whitespace", () => {
    const a = parseDesignation("IS 456 : 2000");
    const b = parseDesignation("  IS   456  :  2000  ");
    expect(a?.key).toBe("is:456");
    expect(a?.keyWithYear).toBe(b?.keyWithYear);
  });

  it("tolerates a trailing amendment suffix", () => {
    const parsed = parseDesignation("IS 456 : 2000 (Amd 1)");
    expect(parsed?.key).toBe("is:456");
    expect(parsed?.year).toBe(2000);
  });

  it("folds unicode dashes to an ASCII hyphen in part/section markers", () => {
    // en dash, em dash, minus sign — as they arrive from copy-pasted PDFs.
    expect(parseDesignation("IS 516 (Part–5/Sec—1) : 2018")?.key).toBe("is:516:p5:s1");
    expect(parseDesignation("IS 516 (Part−5) : 2018")?.key).toBe("is:516:p5");
  });
});

describe("normalizeDesignation / normalizeDesignationWithYear", () => {
  it("returns the base key for a parseable string", () => {
    expect(normalizeDesignation("IS 516 (Part-5/Sec-1) : 2018")).toBe("is:516:p5:s1");
  });

  it("returns the year-qualified key when asked", () => {
    expect(normalizeDesignationWithYear("IS 516 (Part-5/Sec-1) : 2018")).toBe("is:516:p5:s1:2018");
  });

  it("returns an empty string for an unparseable input", () => {
    expect(normalizeDesignation("N/A")).toBe("");
    expect(normalizeDesignationWithYear("N/A")).toBe("");
  });
});

describe("sameStandard — entity-resolution primitive", () => {
  it("matches two forms that differ only in punctuation", () => {
    expect(sameStandard("IS 456:2000", "IS 456 : 2000")).toBe(true);
  });

  it("matches two forms that differ only in year", () => {
    expect(sameStandard("IS 456 : 2000", "IS 456 : 2021")).toBe(true);
  });

  it("matches two forms that differ only in part formatting", () => {
    expect(sameStandard("IS 1489 (Part 1) : 1991", "IS 1489 : PART 1 : 1991")).toBe(true);
  });

  it("distinguishes different standard numbers", () => {
    expect(sameStandard("IS 456:2000", "IS 457:2000")).toBe(false);
  });

  it("distinguishes a part from the whole", () => {
    expect(sameStandard("IS 1489 (Part 1) : 1991", "IS 1489 : 1991")).toBe(false);
  });

  it("is false when either side is unparseable", () => {
    expect(sameStandard("IS 456:2000", "N/A")).toBe(false);
    expect(sameStandard("N/A", "IS 456:2000")).toBe(false);
    expect(sameStandard("N/A", "also nonsense")).toBe(false);
  });
});
