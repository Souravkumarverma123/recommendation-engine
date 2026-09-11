import { describe, expect, it } from "vitest";

import { bisDetailSchema } from "@repo/services/bis/model";

import { mapDetail } from "./map-detail";

/**
 * Pure unit — `mapDetail` (ticket #11). Mirrors `map-list-item.test.ts`: a real
 * captured payload shape in, the `standards` detail columns out. The fixture is
 * the verbatim IS 456:2000 field set from docs/research §4.1.
 */

const IS_456_DETAIL = bisDetailSchema.parse({
  standardNumber: "IS 456:2000",
  standardName: "Plain and reinforced concrete - Code of practice (Fourth Revision)",
  shortTitle: "  Concrete Code  ",
  pk_is_id: 11249,
  publishedOn: "2000-07-31",
  committeeId: 2,
  departmentId: 4,
  groupName: "Building Materials including Paints",
  subGroupName: "Cement, concrete and Allied Products",
  subSubGroupName: "Concrete, Concrete admixtures & additives and testing",
  noOfRevision: "04",
  noOfAmendment: "06",
  typeOfStandardId: "Code of Practice",
  icsCode: null,
  equivalenceTypeName: "Not Equivalent",
  equivalenceId: 4,
  equivalentIs: null,
  identical_is: null,
  supersheed: "",
  superseded_byis: null,
  reAffirmationYear: "2025-07-12",
  withdrawStatus: 0,
  withdrawOn: null,
  isStatus: 2,
  is_documents: "BisProd/bisProd/oldStandards/S03/S03V01/456.pdf",
});

describe("mapDetail", () => {
  it("lifts the detail columns the list harvest cannot supply", () => {
    const fields = mapDetail(IS_456_DETAIL);

    expect(fields).toMatchObject({
      shortTitle: "Concrete Code",
      pkIsId: 11249,
      committeeId: 2,
      departmentId: 4,
      subGroupName: "Cement, concrete and Allied Products",
      subSubGroupName: "Concrete, Concrete admixtures & additives and testing",
      icsCode: null,
      equivalenceType: "Not Equivalent",
      equivalentIsNumber: null,
      isStatus: 2,
      withdrawStatus: 0,
      withdrawnOn: null,
      supersededByRaw: null,
      revisionCount: 4,
      amendmentCount: 6,
      reaffirmationOn: "2025-07-12",
      pdfKey: "BisProd/bisProd/oldStandards/S03/S03V01/456.pdf",
    });
  });

  it("keeps the full payload on `raw` and never touches title-level fields", () => {
    const fields = mapDetail(IS_456_DETAIL) as Record<string, unknown>;
    expect(fields.raw).toBeTruthy();
    expect(fields).not.toHaveProperty("number");
    expect(fields).not.toHaveProperty("title");
    expect(fields).not.toHaveProperty("groupName");
  });

  it("prefers equivalentIs, falls back to identical_is, and drops empty strings", () => {
    expect(
      mapDetail(bisDetailSchema.parse({ standardNumber: "IS/IEC 62368-1:2023", identical_is: "IEC 62368-1:2018" }))
        .equivalentIsNumber,
    ).toBe("IEC 62368-1:2018");
    expect(
      mapDetail(bisDetailSchema.parse({ standardNumber: "IS 1", equivalentIs: "  " })).equivalentIsNumber,
    ).toBeNull();
  });

  it("rejects a garbled count rather than parsing its leading digits", () => {
    const fields = mapDetail(
      bisDetailSchema.parse({ standardNumber: "IS 1", noOfRevision: "04abc", noOfAmendment: "" }),
    );
    expect(fields.revisionCount).toBeNull();
    expect(fields.amendmentCount).toBeNull();
  });

  it("reads a withdrawn standard's supersession pointer and date", () => {
    const fields = mapDetail(
      bisDetailSchema.parse({
        standardNumber: "IS 8112:2013",
        isStatus: 5,
        withdrawStatus: 1,
        withdrawOn: "2015-09-01",
        superseded_byis: "IS 269 : 2015",
      }),
    );
    expect(fields).toMatchObject({
      isStatus: 5,
      withdrawStatus: 1,
      withdrawnOn: "2015-09-01",
      supersededByRaw: "IS 269 : 2015",
    });
  });
});
