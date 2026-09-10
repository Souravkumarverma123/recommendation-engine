import { describe, expect, it } from "vitest";

import type { BisListItem } from "@repo/services/bis/model";
import { mapListItem } from "./map-list-item";

/**
 * Pure unit seam — `mapListItem` (ticket #9). A table of real `getWebsiteIndian
 * StandardsList` rows → the `standards` insert they should produce. No DB, no
 * network. Mirrors the `parseDesignation` suite: this is where the "normalise
 * every designation on ingest" contract is pinned.
 */

/** A representative catalogue row, verbatim shape from the live API (2026-09-11). */
const ROW: BisListItem = {
  standardId: 67169,
  standardEncId: "eyJpdiI6IkNuU0siLCJ2YWx1ZSI6ImVhIn0=",
  standardLabel: "IS 10325:2026 Square tins of 15 kg capacity — Specification (third revision)",
  standardNumber: "IS 10325:2026",
  standardName: "Square tins of 15 kg or 15 litre capacity for ghee — Specification (third revision)",
  departmentName: "PRODUCTION AND GENERAL ENGINEERING DEPARTMENT (PGD)",
  sectionalCommitteeName: "PGD 38 - Metal Containers",
  typeOfStandardName: "Product Specification",
  publishedOn: "2026-08-04",
  publishedOnFormatted: "04 Aug 2026",
};

describe("mapListItem — one catalogue row → a standards insert", () => {
  it("maps every modelled field across", () => {
    const row = mapListItem(ROW);
    expect(row).not.toBeNull();
    expect(row).toMatchObject({
      bisStandardId: 67169,
      bisEncId: ROW.standardEncId,
      number: "IS 10325:2026",
      numberNormalized: "is:10325",
      series: "IS",
      editionYear: 2026,
      title: ROW.standardName,
      typeOfStandard: "Product Specification",
      groupName: "PGD 38 - Metal Containers",
      publishedOn: "2026-08-04",
    });
  });

  it("normalises the designation through parseDesignation on ingest", () => {
    const paren = mapListItem({ ...ROW, standardNumber: "IS 516 (Part-5/Sec-1) : 2018" });
    const colon = mapListItem({ ...ROW, standardId: 2, standardNumber: "IS 516 : Part 5 : Sec 1 : 2018" });
    expect(paren?.numberNormalized).toBe("is:516:p5:s1");
    expect(colon?.numberNormalized).toBe(paren?.numberNormalized);
  });

  it("keeps the dual-number series for IS/IEC and IS/ISO adoptions", () => {
    expect(mapListItem({ ...ROW, standardNumber: "IS/IEC 62368-1:2023" })?.series).toBe("IS/IEC");
    expect(mapListItem({ ...ROW, standardNumber: "IS/ISO 9001 : 2015" })?.series).toBe("IS/ISO");
  });

  it("falls back to the label, then the number, when standardName is missing", () => {
    expect(mapListItem({ ...ROW, standardName: null })?.title).toBe(ROW.standardLabel);
    expect(mapListItem({ ...ROW, standardName: null, standardLabel: null })?.title).toBe(
      "IS 10325:2026",
    );
  });

  it("trims whitespace around the designation and title", () => {
    const row = mapListItem({
      ...ROW,
      standardNumber: "  IS 10325:2026 ",
      standardName: "  Square tins  ",
    });
    expect(row?.number).toBe("IS 10325:2026");
    expect(row?.title).toBe("Square tins");
  });

  it("normalises a missing or malformed publish date to null", () => {
    expect(mapListItem({ ...ROW, publishedOn: null })?.publishedOn).toBeNull();
    expect(mapListItem({ ...ROW, publishedOn: "not-a-date" })?.publishedOn).toBeNull();
  });

  it("rejects an impossible calendar date rather than passing it to Postgres", () => {
    expect(mapListItem({ ...ROW, publishedOn: "2026-99-99" })?.publishedOn).toBeNull();
    expect(mapListItem({ ...ROW, publishedOn: "2026-02-30" })?.publishedOn).toBeNull();
    expect(mapListItem({ ...ROW, publishedOn: "0000-00-00" })?.publishedOn).toBeNull();
    expect(mapListItem({ ...ROW, publishedOn: "2024-02-29" })?.publishedOn).toBe("2024-02-29");
  });

  it("has no edition year when the designation carries none", () => {
    expect(mapListItem({ ...ROW, standardNumber: "IS 8112" })?.editionYear).toBeNull();
  });

  it("keeps the raw payload for provenance", () => {
    expect(mapListItem(ROW)?.raw).toEqual(ROW);
  });

  it("returns null for a row whose designation cannot be parsed", () => {
    expect(mapListItem({ ...ROW, standardNumber: "N/A" })).toBeNull();
    expect(mapListItem({ ...ROW, standardNumber: "" })).toBeNull();
  });
});
