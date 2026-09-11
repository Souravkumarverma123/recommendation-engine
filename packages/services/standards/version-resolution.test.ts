import { beforeAll, describe, expect, it } from "vitest";

import { and, db, gte, lt } from "@repo/database";
import { standardsTable } from "@repo/database/schema";
import { parseDesignation } from "../bis/designation";
import { prepareDemoDatabase } from "../test/prepare-db";
import { StandardsService } from "./index";

beforeAll(prepareDemoDatabase);

/**
 * Seam — `StandardsService.resolveVersions`'s DB-backed fetch (ticket #12).
 *
 * `version.test.ts` covers the pure walk against an in-memory `VersionIndex`;
 * this covers the surrounding fetch loop against a real Postgres, since the
 * off-by-one CodeAnt flagged (too few fetch rounds for a chain using every
 * hop `resolveVersion` allows) only shows up once the walk and the fetch are
 * wired together — the pure walk alone can't tell you whether the row it
 * needed was ever fetched from the DB.
 */
const service = new StandardsService({ embeddings: null });

/** A reserved id band clear of the demo (9,000,000s) and allied (10,000,000s) bands. */
const CHAIN_BIS_ID_MIN = 11_000_000;
const CHAIN_BIS_ID_MAX = 12_000_000;

async function cleanupChainRows(): Promise<void> {
  await db
    .delete(standardsTable)
    .where(
      and(
        gte(standardsTable.bisStandardId, CHAIN_BIS_ID_MIN),
        lt(standardsTable.bisStandardId, CHAIN_BIS_ID_MAX),
      ),
    );
}

/** Seeds a synthetic supersession chain `length` hops deep, oldest first. */
async function seedChain(length: number): Promise<string[]> {
  const numbers = Array.from({ length: length + 1 }, (_, i) => `IS 900${i}:20${10 + i}`);
  const rows = numbers.map((number, i) => {
    const parsed = parseDesignation(number)!;
    const isLast = i === numbers.length - 1;
    return {
      bisStandardId: CHAIN_BIS_ID_MIN + i,
      number,
      numberNormalized: parsed.key,
      editionYear: parsed.year,
      title: `synthetic chain link ${i}`,
      isStatus: isLast ? 2 : 5,
      supersededByRaw: isLast ? null : numbers[i + 1],
    };
  });

  await db.insert(standardsTable).values(rows);
  return numbers;
}

describe("StandardsService.resolveVersions — fetches enough rounds for a chain using every hop", () => {
  it("resolves a chain exactly MAX_CHAIN_HOPS transitions deep to its final successor", async () => {
    const numbers = await seedChain(5);
    try {
      const resolved = await service.resolveVersions([numbers[0]!]);
      const resolution = resolved.get(numbers[0]!);

      expect(resolution?.current.number).toBe(numbers[numbers.length - 1]);
      expect(resolution?.supersedes).toEqual(numbers.slice(0, -1));
    } finally {
      await cleanupChainRows();
    }
  });
});
