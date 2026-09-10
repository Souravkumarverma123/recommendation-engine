import { beforeAll, describe, expect, it } from "vitest";

import { prepareDemoDatabase } from "../test/prepare-db";
import { QcoService } from "./index";

beforeAll(prepareDemoDatabase);

/**
 * Seam — `qco.checkStatus` (integration, ticket #8).
 *
 * Runs against real Postgres seeded with the hand-reviewed QCO obligations.
 * Assertions are on the verdict and the citation a procurement officer would
 * paste into a tender — never on the SQL or the match internals. The check is
 * independent of retrieval: these calls pass only an IS number.
 */

const qco = new QcoService();

describe("qco.checkStatus — independent regulatory check", () => {
  it("flags an office chair MANDATORY with the S.O. 801(E) citation", async () => {
    const result = await qco.checkStatus({ isNumber: "IS 17631:2022" });

    expect(result.status).toBe("MANDATORY");
    expect(result.qco?.title).toBe("Furniture (Quality Control) Order, 2025");
    expect(result.qco?.soNumbers).toContain("S.O. 801(E)");
    expect(result.qco?.enforcementDate).toBe("2026-08-14");
    expect(result.qco?.scheme).toBe("I");
  });

  it("flags reinforcement steel MANDATORY under the Steel QCO", async () => {
    const result = await qco.checkStatus({ isNumber: "IS 1786 : 2008" });

    expect(result.status).toBe("MANDATORY");
    expect(result.qco?.title).toContain("Steel and Steel Products");
    expect(result.qco?.soNumbers).toContain("S.O. 4637(E)");
  });

  it("resolves formatting and year differences to the same obligation", async () => {
    const a = await qco.checkStatus({ isNumber: "IS 269:2015" });
    const b = await qco.checkStatus({ isNumber: "IS 269 : 2020" });

    expect(a.status).toBe("MANDATORY");
    expect(b.status).toBe("MANDATORY");
    expect(b.qco?.soNumbers).toEqual(a.qco?.soNumbers);
  });

  it("returns a verified VOLUNTARY for a code of practice under no QCO", async () => {
    const result = await qco.checkStatus({
      isNumber: "IS 456:2000",
      productText: "RCC structural work per IS 456",
    });

    expect(result.status).toBe("VOLUNTARY");
    expect(result.qco).toBeNull();
  });

  it("KNOWN GAP: a superseded designation reads VOLUNTARY until version resolution lands", async () => {
    // IS 8112 is itself under no QCO — the obligation moved to IS 269:2015 when
    // the OPC grades were consolidated. So "cement conforming to IS 8112" is a
    // false-negative today (PRD user story 12). Fixing it needs the supersession
    // graph (PRD §Pipeline step 7); this test characterises the current
    // behaviour so that change is a deliberate, visible one.
    const result = await qco.checkStatus({ isNumber: "IS 8112:2013" });
    expect(result.status).toBe("VOLUNTARY");
  });

  it("routes a horizontal-QCO scope match to NEEDS_REVIEW", async () => {
    const result = await qco.checkStatus({
      isNumber: "IS 302 (Part 1):2008",
      productText: "supply of 500 household electrical appliances — room heaters, 2000 W",
    });

    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.qco?.title).toContain("Household");
    expect(result.note).toBeTruthy();
  });

  it("does not fire NEEDS_REVIEW for the demo domains", async () => {
    const chair = await qco.checkStatus({
      isNumber: "IS 999:1999",
      productText: "500 ergonomic office chairs for a government secretariat",
    });
    expect(chair.status).toBe("VOLUNTARY");
  });
});
