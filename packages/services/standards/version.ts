/**
 * Version / supersession resolution (ticket #12, docs/PRD.md §Pipeline step 7,
 * user stories 7-10).
 *
 * A shortlisted standard's `isStatus` may say withdrawn, and `supersededByRaw`
 * may point at a different (or lower) number, or at a part of a consolidated
 * standard — "OPC 43 grade to IS 8112" must resolve to IS 269:2015, the
 * standard that actually applies today, not stay pinned to a dead citation.
 * This module walks that chain purely in memory against a lightweight
 * snapshot of the catalogue's lifecycle fields; the regulatory badge and
 * every other authoritative fact is unaffected — this module only decides
 * *which designation* is current.
 *
 * Pure walk + one read method on {@link StandardsService} (`index.ts`),
 * mirroring `allied.ts`. Exercised through the `recommend.run` seam
 * (`recommend/pipeline.test.ts`) and directly in `version.test.ts`.
 */
import { z } from "zod";

import { parseDesignation } from "../bis/designation";
import { lifecycleStatusSchema, toLifecycleStatus } from "./model";

/** Lightweight lifecycle snapshot of one catalogue row — enough to walk the chain. */
export interface VersionRow {
  number: string;
  title: string;
  isStatus: number | null;
  supersededByRaw: string | null;
  validUpto: string | null;
  editionYear: number | null;
}

export const versionResolutionSchema = z.object({
  /** The designation that actually applies today — itself, when the input needed no resolution or none was possible. */
  current: z.object({
    number: z.string(),
    title: z.string(),
    isStatus: z.number().int().nullable(),
    lifecycleStatus: lifecycleStatusSchema,
  }),
  /** Withdrawn designations resolved through to reach `current`, oldest first. Empty when the input needed no resolution. */
  supersedes: z.array(z.string()),
  /**
   * The originally-resolved designation, still valid alongside `current` —
   * set only when the standard the caller actually asked to resolve carries a
   * future `validUpto` (docs/PRD.md user story 10, "concurrent running").
   */
  concurrentWith: z
    .object({ number: z.string(), title: z.string(), validUntil: z.string() })
    .nullable(),
});
export type VersionResolution = z.infer<typeof versionResolutionSchema>;

/**
 * Hops before a chain is abandoned rather than followed further. Real BIS
 * supersession chains are one or two hops; this is a generous ceiling against
 * hand-transcription mistakes, not an expected depth. Exported so a caller
 * fetching rows one hop at a time (`StandardsService.resolveVersions`) can
 * bound its own lookup rounds to the same ceiling the walk itself respects.
 */
export const MAX_CHAIN_HOPS = 5;

/** A bucketed row alongside the edition year read off its own designation string. */
interface IndexedRow {
  row: VersionRow;
  /** Parsed from `row.number` itself — falls back to the `editionYear` column only when the designation string carries no year at all. */
  year: number | null;
}

/**
 * Resolves a raw designation string to the catalogue row it names: the exact
 * edition when the raw string carried a year, otherwise the newest edition on
 * file for that number.
 */
export class VersionIndex {
  private readonly byKey = new Map<string, IndexedRow[]>();

  constructor(rows: VersionRow[]) {
    for (const row of rows) {
      const parsed = parseDesignation(row.number);
      if (!parsed) continue;
      const bucket = this.byKey.get(parsed.key) ?? [];
      bucket.push({ row, year: parsed.year ?? row.editionYear });
      this.byKey.set(parsed.key, bucket);
    }
    for (const bucket of this.byKey.values()) {
      bucket.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    }
  }

  find(raw: string): VersionRow | undefined {
    const parsed = parseDesignation(raw);
    if (!parsed) return undefined;
    const bucket = this.byKey.get(parsed.key);
    if (!bucket || bucket.length === 0) return undefined;
    // A raw string with no year is ambiguous by design — the newest edition on
    // file is the reasonable answer. A raw string that DOES name a year but
    // matches no row is a dangling/mistyped reference, not an ambiguity: falling
    // back to "whatever edition happens to be newest" would silently resolve to
    // a standard the data never actually named. The comparison is against each
    // row's own designation-derived year, not the separate `editionYear` column,
    // so it can't be defeated by that column being unset while the number string
    // itself carries a year.
    if (parsed.year == null) return bucket[0]?.row;
    return bucket.find((entry) => entry.year === parsed.year)?.row;
  }
}

/** True when `isoDate` parses to a calendar date strictly after `now`. */
function isFutureDate(isoDate: string | null, now: Date): boolean {
  if (!isoDate) return false;
  const parsed = new Date(isoDate);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() > now.getTime();
}

/**
 * Walk `supersededByRaw` from `startNumber` to the standard that actually
 * applies today. Stops at whichever comes first: an edition that is not
 * withdrawn, a dangling reference `index` cannot resolve, a cycle, or
 * {@link MAX_CHAIN_HOPS} hops — each a real possibility in hand-transcribed BIS
 * data, and each safer to surface as "this is as far as we can resolve" than
 * to loop or throw. Returns `null` only when `startNumber` itself is not in
 * `index` (not a catalogued standard at all).
 */
export function resolveVersion(
  startNumber: string,
  index: VersionIndex,
  now: Date = new Date(),
): VersionResolution | null {
  const start = index.find(startNumber);
  if (!start) return null;

  const supersedes: string[] = [];
  const visitedKeys = new Set<string>();
  let node = start;

  for (let hop = 0; hop < MAX_CHAIN_HOPS; hop++) {
    const key = parseDesignation(node.number)?.key ?? node.number;
    if (visitedKeys.has(key)) break;
    visitedKeys.add(key);

    if (toLifecycleStatus(node.isStatus) !== "WITHDRAWN" || !node.supersededByRaw) break;

    const next = index.find(node.supersededByRaw);
    if (!next) break;

    supersedes.push(node.number);
    node = next;
  }

  // Concurrent-running is about whether the edition the officer actually cited
  // (`start`) is still valid alongside `node` — not whichever standard happened
  // to be the last hop before it. A multi-hop chain would otherwise report the
  // wrong (or no) concurrent companion, since only the immediately-preceding
  // hop's `validUpto` would ever be considered.
  const concurrentWith =
    start !== node &&
    toLifecycleStatus(start.isStatus) === "WITHDRAWN" &&
    isFutureDate(start.validUpto, now)
      ? {
          number: start.number,
          title: start.title,
          validUntil: start.validUpto as string,
        }
      : null;

  return {
    current: {
      number: node.number,
      title: node.title,
      isStatus: node.isStatus,
      lifecycleStatus: toLifecycleStatus(node.isStatus),
    },
    supersedes,
    concurrentWith,
  };
}
