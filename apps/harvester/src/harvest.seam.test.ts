import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { and, db, desc, eq, gte, lt, or } from "@repo/database";
import { harvestRunsTable, standardsTable } from "@repo/database/schema";
import { runMigrations } from "@repo/database/migrate";
import type { BisListItem } from "@repo/services/bis/model";
import type { EmbeddingProvider } from "@repo/services/llm/embeddings";
import { fakeEmbeddingProvider } from "@repo/services/test/fake-embeddings";
import {
  DEMO_BIS_ID_MAX,
  DEMO_BIS_ID_MIN,
} from "@repo/services/standards/seed/demo-standards.data";
import { embedDemoStandards } from "@repo/services/standards/seed/embed";
import { loadDemoStandards } from "@repo/services/standards/seed/load";
import { StandardsService } from "@repo/services/standards";

import type { CatalogueSource } from "./catalogue";
import { runHarvest } from "./harvest";

/**
 * Seam — the full-catalogue harvest (integration, ticket #9).
 *
 * Runs against a real Postgres. The BIS API is replaced by a fake catalogue and
 * OpenAI by the deterministic fake embedder (the PRD's rule for the harvester:
 * "verified by asserting row counts after a run", not by mocking HTTP). Assertions
 * are on observable outcomes — what lands in `standards`, what `harvest_runs`
 * records, what `standards.search` can now find — never on the SQL.
 *
 * The live HTTP behaviour is covered by the manual verification step in the PR.
 */

/** Synthetic BIS ids for this test's rows — below the demo band, cleared around each run. */
const TEST_ID_MIN = 8_100_000;
const TEST_ID_MAX = 8_200_000;
/** Stands in for a real harvested row in the demo top-up test. */
const HARVESTED_IS_456_ID = 8_050_000;

/**
 * Everything not hand-seeded: a full harvest's rows sit below the demo band,
 * and the allied-standards seed's companion rows (ticket #11) sit above it.
 * Both must be gone so the embed-backfill count assertions are exact.
 */
const nonSeedRows = or(
  lt(standardsTable.bisStandardId, DEMO_BIS_ID_MIN),
  gte(standardsTable.bisStandardId, DEMO_BIS_ID_MAX),
);

async function resetToDemoSlice() {
  await db.delete(standardsTable).where(nonSeedRows);
  await db.delete(harvestRunsTable);
  await loadDemoStandards();
  // Give the demo rows vectors so a later `embedCatalogue` only touches what the
  // harvest itself added.
  await embedDemoStandards(fakeEmbeddingProvider);
}

const FAKE_CATALOGUE: BisListItem[] = [
  item(8_100_001, "IS 99801:2021", "Reinforced concrete water tanks — Code of practice", "Code of Practice"),
  item(8_100_002, "IS 99802 (Part 1):2019", "Protective helmets for industrial workers — Specification", "Product Specification"),
  item(8_100_003, "IS 99803:2020", "Hot rolled steel channel sections for structural use", "Product Specification"),
  item(8_100_004, "IS/IEC 99804:2023", "Office chair power adapters — Safety requirements", "Product Specification"),
  // Unparseable — must be counted as skipped, never written.
  item(8_100_005, "N/A", "A row with no usable designation", null),
];

const PARSEABLE = FAKE_CATALOGUE.length - 1;

function item(
  standardId: number,
  standardNumber: string,
  standardName: string,
  typeOfStandardName: string | null,
): BisListItem {
  return {
    standardId,
    standardEncId: `enc-${standardId}`,
    standardLabel: `${standardNumber} ${standardName}`,
    standardNumber,
    standardName,
    departmentName: "TEST DEPARTMENT",
    sectionalCommitteeName: "TST 1 - Test Committee",
    typeOfStandardName,
    publishedOn: "2021-01-01",
    publishedOnFormatted: "01 Jan 2021",
  };
}

function fakeClient(items: BisListItem[]): CatalogueSource {
  return {
    async *iterateAllStandards() {
      yield* items;
    },
  };
}

beforeAll(async () => {
  await runMigrations();
  // Start from the demo slice alone — drop any real catalogue a local `pnpm
  // harvest` left behind so the row-count assertions are exact.
  await resetToDemoSlice();
});

afterAll(resetToDemoSlice);

describe("full-catalogue harvest", () => {
  it("upserts every parseable catalogue row and skips the rest", async () => {
    const result = await runHarvest({
      client: fakeClient(FAKE_CATALOGUE),
      embeddings: fakeEmbeddingProvider,
      catalogueBatchSize: 2,
      embedBatchSize: 2,
    });

    expect(result).toMatchObject({
      fetched: FAKE_CATALOGUE.length,
      upserted: PARSEABLE,
      skipped: 1,
      embedded: PARSEABLE,
    });

    const rows = await db
      .select()
      .from(standardsTable)
      .where(
        and(
          gte(standardsTable.bisStandardId, TEST_ID_MIN),
          lt(standardsTable.bisStandardId, TEST_ID_MAX),
        ),
      );
    expect(rows).toHaveLength(PARSEABLE);
    expect(rows.every((r) => r.embedding != null)).toBe(true);
    expect(rows.find((r) => r.bisStandardId === 8_100_002)?.numberNormalized).toBe("is:99802:p1");
  });

  it("records the run in harvest_runs with a matching row count", async () => {
    const [run] = await db
      .select()
      .from(harvestRunsTable)
      .where(eq(harvestRunsTable.kind, "list"))
      .orderBy(desc(harvestRunsTable.startedAt))
      .limit(1);

    expect(run?.ok).toBe("true");
    expect(run?.finishedAt).not.toBeNull();
    expect(run?.recordCount).toBe(PARSEABLE);

    const bandCount = await db.$count(
      standardsTable,
      and(
        gte(standardsTable.bisStandardId, TEST_ID_MIN),
        lt(standardsTable.bisStandardId, TEST_ID_MAX),
      ),
    );
    expect(bandCount).toBe(run?.recordCount);
  });

  it("makes the harvested rows searchable from across the catalogue", async () => {
    const search = new StandardsService({ embeddings: null });
    const { results } = await search.search({ query: "reinforced concrete water tanks" });
    expect(results.map((r) => r.number)).toContain("IS 99801:2021");
  });

  it("records the embedding backfill as its own harvest_runs row", async () => {
    const [run] = await db
      .select()
      .from(harvestRunsTable)
      .where(eq(harvestRunsTable.kind, "embeddings"))
      .orderBy(desc(harvestRunsTable.startedAt))
      .limit(1);
    expect(run?.ok).toBe("true");
    expect(run?.recordCount).toBe(PARSEABLE);
  });

  it("fails the embeddings run — not the list run — when embedding throws", async () => {
    await resetToDemoSlice();
    const brokenEmbedder: EmbeddingProvider = {
      embed: () => Promise.reject(new Error("embedding provider down")),
    };

    await expect(
      runHarvest({ client: fakeClient(FAKE_CATALOGUE), embeddings: brokenEmbedder }),
    ).rejects.toThrow("embedding provider down");

    const runs = await db
      .select()
      .from(harvestRunsTable)
      .orderBy(desc(harvestRunsTable.startedAt));
    const list = runs.find((r) => r.kind === "list");
    const embeddings = runs.find((r) => r.kind === "embeddings");
    expect(list?.ok).toBe("true");
    expect(embeddings?.ok).toBe("false");
    expect(embeddings?.notes).toContain("embedding provider down");
  });

  it("is idempotent — a second run neither duplicates nor errors", async () => {
    const again = await runHarvest({
      client: fakeClient(FAKE_CATALOGUE),
      embeddings: fakeEmbeddingProvider,
    });
    expect(again.upserted).toBe(PARSEABLE);

    const bandCount = await db.$count(
      standardsTable,
      and(
        gte(standardsTable.bisStandardId, TEST_ID_MIN),
        lt(standardsTable.bisStandardId, TEST_ID_MAX),
      ),
    );
    expect(bandCount).toBe(PARSEABLE);
  });

  it("marks the run failed when the catalogue source throws", async () => {
    const boom: CatalogueSource = {
      // eslint-disable-next-line require-yield
      async *iterateAllStandards() {
        throw new Error("BIS API unreachable");
      },
    };

    await expect(
      runHarvest({ client: boom, embeddings: null }),
    ).rejects.toThrow("BIS API unreachable");

    const [run] = await db
      .select()
      .from(harvestRunsTable)
      .where(eq(harvestRunsTable.kind, "list"))
      .orderBy(desc(harvestRunsTable.startedAt))
      .limit(1);
    expect(run?.ok).toBe("false");
    expect(run?.notes).toContain("BIS API unreachable");
  });
});

describe("demo seed top-up onto a harvested row", () => {
  it("enriches the harvested catalogue row instead of adding a demo-band duplicate", async () => {
    // Simulate the harvest having ingested a demo designation title-level only.
    await db
      .insert(standardsTable)
      .values({
        bisStandardId: HARVESTED_IS_456_ID,
        number: "IS 456:2000",
        numberNormalized: "is:456",
        series: "IS",
        title: "Plain and Reinforced Concrete — Code of Practice",
      })
      .onConflictDoNothing();
    await db
      .delete(standardsTable)
      .where(
        and(
          gte(standardsTable.bisStandardId, DEMO_BIS_ID_MIN),
          eq(standardsTable.numberNormalized, "is:456"),
        ),
      );

    const result = await loadDemoStandards();
    expect(result.toppedUp).toBeGreaterThan(0);

    const rows = await db
      .select()
      .from(standardsTable)
      .where(eq(standardsTable.numberNormalized, "is:456"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.bisStandardId).toBe(HARVESTED_IS_456_ID);
    expect(rows[0]?.summary?.toLowerCase()).toContain("concrete");
    expect(rows[0]?.isStatus).toBe(2);
    // BIS stays authoritative for the title-level fields the harvest owns.
    expect(rows[0]?.title).toBe("Plain and Reinforced Concrete — Code of Practice");
  });
});
