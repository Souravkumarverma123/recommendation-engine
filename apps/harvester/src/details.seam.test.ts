import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { and, db, desc, eq, gte, lt } from "@repo/database";
import {
  amendmentsTable,
  harvestRunsTable,
  standardEdgesTable,
  standardsTable,
} from "@repo/database/schema";
import { runMigrations } from "@repo/database/migrate";
import { parseDesignation } from "@repo/services/bis/designation";
import type { BisAmendment, BisCrossRef, BisDetail } from "@repo/services/bis/model";
import { DEMO_BIS_ID_MIN } from "@repo/services/standards/seed/demo-standards.data";
import { StandardsService } from "@repo/services/standards";

import { harvestDetails, type DetailSource } from "./details";

/**
 * Seam — the demo-slice detail + relationship harvest (integration, ticket #11).
 *
 * Runs against a real Postgres. The three BIS per-standard endpoints are
 * replaced by a fake `DetailSource`; assertions are on what lands in
 * `standards`, `amendments` and `standard_edges`, and on what the
 * allied-standards walk can then see — never on the HTTP or the SQL (docs/PRD.md
 * §Testing Decisions).
 */

/** Synthetic BIS id band for this test's rows — below the demo band, cleared each run. */
const TEST_ID_MIN = 8_300_000;
const TEST_ID_MAX = 8_400_000;

const PRIMARY = { bisStandardId: 8_300_001, encId: "enc-primary", number: "IS 70001:2020" };
const NO_ENCID = { bisStandardId: 8_300_002, number: "IS 70003:2019" };
const REF_TEST_METHOD = {
  standardId: 8_300_050,
  standardEncId: "enc-ref-1",
  standardNumber: "IS 70002 (Part 1):2018",
  standardName: "Widget Testing — Methods of Test: Part 1 Dimensional Checks",
};

const testKeys = [PRIMARY.number, NO_ENCID.number]
  .map((n) => parseDesignation(n)!.key);

const DETAIL: BisDetail = {
  standardNumber: PRIMARY.number,
  standardName: "Widgets for General Use — Specification",
  shortTitle: "Widget Spec",
  pk_is_id: 999001,
  noOfRevision: "02",
  noOfAmendment: "02",
  isStatus: 2,
  withdrawStatus: 0,
  reAffirmationYear: "2024-05-01",
  equivalenceTypeName: "Not Equivalent",
  is_documents: "BisProd/widgets/70001.pdf",
} as BisDetail;

const AMENDMENTS: BisAmendment[] = [
  { standardId: PRIMARY.bisStandardId, standardNumber: PRIMARY.number, noOfAmendment: 1, amendmentYear: "2021", amendmentLabel: "First Amendment", is_documents: "amd/1.pdf" },
  { standardId: PRIMARY.bisStandardId, standardNumber: PRIMARY.number, noOfAmendment: 2, amendmentYear: "2023", amendmentLabel: "Second Amendment", is_documents: "amd/2.pdf" },
];

const FORWARD: BisCrossRef[] = [
  { ...REF_TEST_METHOD, isType: 1, typeLabel: "Indian Standard" },
  { standardId: 0, standardNumber: "ISO 9001:2015", standardName: "Quality management systems", isType: 2, typeLabel: "International" },
  // Unparseable — must be ignored, never written.
  { standardId: 0, standardNumber: "N/A", isType: 4 },
];

const REVERSE: BisCrossRef[] = [
  { standardId: 8_300_090, standardNumber: "IS 70009:2022", standardName: "Widget Assemblies", isType: 5 },
];

function fakeClient(): DetailSource {
  return {
    getStandardDetails: (encId) => {
      expect(encId).toBe(PRIMARY.encId);
      return Promise.resolve(DETAIL);
    },
    getAmendments: () => Promise.resolve(AMENDMENTS),
    getCrossRefs: () => Promise.resolve({ forward: FORWARD, reverse: REVERSE }),
  };
}

async function resetBand() {
  // Everything this test writes lives below the demo band.
  const harvested = lt(standardsTable.bisStandardId, DEMO_BIS_ID_MIN);
  await db.delete(standardsTable).where(harvested);
}

async function seedPrimary() {
  await resetBand();
  await db.insert(standardsTable).values([
    {
      bisStandardId: PRIMARY.bisStandardId,
      bisEncId: PRIMARY.encId,
      number: PRIMARY.number,
      numberNormalized: parseDesignation(PRIMARY.number)!.key,
      series: "IS",
      editionYear: 2020,
      title: "Widgets for General Use — Specification",
    },
    {
      bisStandardId: NO_ENCID.bisStandardId,
      number: NO_ENCID.number,
      numberNormalized: parseDesignation(NO_ENCID.number)!.key,
      series: "IS",
      editionYear: 2019,
      title: "Widget Fasteners — Specification",
    },
  ]);
}

beforeAll(async () => {
  await runMigrations();
  await seedPrimary();
});

afterAll(resetBand);

const run = () => harvestDetails({ client: fakeClient(), targetKeys: testKeys });

describe("detail harvest — one demo standard", () => {
  it("enriches the standard, skipping the one with no encId", async () => {
    const result = await run();

    expect(result).toMatchObject({
      standardsEnriched: 1,
      amendmentsUpserted: 2,
      companionsIngested: 1,
      skippedNoEncId: 1,
    });
    // 1 REFERS_TO + 1 EQUIVALENT_TO + 1 REFERENCED_BY (the N/A ref is dropped).
    expect(result.edgesUpserted).toBe(3);

    const [row] = await db
      .select()
      .from(standardsTable)
      .where(eq(standardsTable.bisStandardId, PRIMARY.bisStandardId));
    expect(row?.revisionCount).toBe(2);
    expect(row?.amendmentCount).toBe(2);
    expect(row?.isStatus).toBe(2);
    expect(row?.reaffirmationOn).toBe("2024-05-01");
    expect(row?.pdfKey).toBe("BisProd/widgets/70001.pdf");
    // The title-level fields are left to their owner.
    expect(row?.title).toBe("Widgets for General Use — Specification");
  });

  it("records one amendments row per published amendment", async () => {
    const rows = await db
      .select()
      .from(amendmentsTable)
      .where(eq(amendmentsTable.bisStandardId, PRIMARY.bisStandardId));
    expect(rows.map((r) => r.amendmentNo).sort()).toEqual([1, 2]);
    expect(rows.find((r) => r.amendmentNo === 2)?.year).toBe(2023);
  });

  it("ingests the forward Indian reference title-level and resolves the edge", async () => {
    const [companion] = await db
      .select()
      .from(standardsTable)
      .where(eq(standardsTable.numberNormalized, parseDesignation(REF_TEST_METHOD.standardNumber)!.key));
    expect(companion?.title).toContain("Methods of Test");

    const [primary] = await db
      .select({ id: standardsTable.id })
      .from(standardsTable)
      .where(eq(standardsTable.bisStandardId, PRIMARY.bisStandardId));
    const edges = await db
      .select()
      .from(standardEdgesTable)
      .where(eq(standardEdgesTable.srcStandardId, primary!.id));
    const refersTo = edges.find((e) => e.type === "REFERS_TO");
    expect(refersTo?.dstStandardId).toBe(companion?.id);

    const equivalent = edges.find((e) => e.type === "EQUIVALENT_TO");
    expect(equivalent?.dstNumberRaw).toBe("ISO 9001:2015");
    expect(equivalent?.dstStandardId).toBeNull(); // international — not ingested

    const referencedBy = edges.find((e) => e.type === "REFERENCED_BY");
    expect(referencedBy?.dstNumberRaw).toBe("IS 70009:2022");
  });

  it("surfaces the reference through the allied-standards walk, tagged TEST_METHOD", async () => {
    const allied = await new StandardsService({ embeddings: null }).allied([PRIMARY.number]);
    const list = allied.get(PRIMARY.number) ?? [];
    expect(list.some((a) => a.role === "TEST_METHOD")).toBe(true);
    expect(list.every((a) => a.relation === "REFERS_TO")).toBe(true);
  });

  it("is idempotent — a second run neither duplicates rows nor errors", async () => {
    const again = await run();
    expect(again).toMatchObject({ standardsEnriched: 1, amendmentsUpserted: 2, skippedNoEncId: 1 });

    const amendmentCount = await db.$count(
      amendmentsTable,
      eq(amendmentsTable.bisStandardId, PRIMARY.bisStandardId),
    );
    expect(amendmentCount).toBe(2);

    const bandCount = await db.$count(
      standardsTable,
      and(
        gte(standardsTable.bisStandardId, TEST_ID_MIN),
        lt(standardsTable.bisStandardId, TEST_ID_MAX),
      ),
    );
    // 2 seeded + 1 companion.
    expect(bandCount).toBe(3);
  });

  it("records the run in harvest_runs with a matching count", async () => {
    const [runRow] = await db
      .select()
      .from(harvestRunsTable)
      .where(eq(harvestRunsTable.kind, "details"))
      .orderBy(desc(harvestRunsTable.startedAt))
      .limit(1);
    expect(runRow?.ok).toBe("true");
    expect(runRow?.finishedAt).not.toBeNull();
    expect(runRow?.recordCount).toBe(1);
  });
});
