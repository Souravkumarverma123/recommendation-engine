/**
 * Deterministic gap warnings for version resolution (ticket #12, docs/PRD.md
 * user story 8). `RecommendService.run()` resolves every shortlisted standard
 * to its current edition (`standards/version.ts`) before this module runs;
 * when that resolution absorbed a withdrawn designation, and the officer's own
 * input actually named it, this turns that into a `SUPERSEDED_CITATION` gap
 * warning naming the successor. Unlike the reasoner's own guess at the same
 * warning kind, this one is authoritative — it comes from `isStatus` /
 * `superseded_byis`, never from the LLM (docs/PRD.md §Architecture).
 *
 * Pure — no DB, no network. Exercised through the `recommend.run` seam and
 * directly in supersession.test.ts.
 */
import { normalizeDesignation, parseDesignation, sameStandard } from "../bis/designation";
import type { GapWarning } from "./reasoner";
import { DESIGNATION_IN_PROSE_RE } from "./verify";

/**
 * The designation-shaped run in `sourceText` that names the same standard and
 * edition as `designation`, or `null` if it was never cited. Reuses the same
 * "find a BIS designation in free prose" primitive as `verify.ts`'s
 * candidate-tracing check, so a citation in any of the formats
 * `parseDesignation` already tolerates (a part written as "Part 3" or
 * "(Part-3)", a spaced "IS / IEC" series, with or without the edition year)
 * is still caught, not just an exact character-for-character match. A run
 * only counts as a match when neither side names a year (ambiguous — assume
 * the same edition) or both name the *same* year: `designation` is the one
 * specific withdrawn edition version resolution actually confirmed superseded,
 * so a citation of a different explicit year for the same base number must
 * not be claimed superseded on its authority.
 */
function citedIn(designation: string, sourceText: string): string | null {
  const runs = sourceText.match(DESIGNATION_IN_PROSE_RE) ?? [];
  const designationYear = parseDesignation(designation)?.year;
  return (
    runs.find((run) => {
      if (!sameStandard(run, designation)) return false;
      const runYear = parseDesignation(run)?.year;
      return runYear == null || designationYear == null || runYear === designationYear;
    }) ?? null
  );
}

export interface SupersessionCandidate {
  /** The current edition's designation — what the officer should cite instead. */
  number: string;
  /** Withdrawn designations version resolution absorbed to reach `number`. */
  supersedes: string[];
}

/**
 * One `SUPERSEDED_CITATION` warning per withdrawn designation a result's
 * resolution absorbed, naming the current edition — but only when the
 * officer's own text actually cited the withdrawn number, so a resolution
 * that happened purely because retrieval also surfaced the successor
 * separately does not manufacture a warning about a citation nobody made.
 */
export function supersessionWarnings(
  candidates: readonly SupersessionCandidate[],
  specText: string,
): GapWarning[] {
  const warnings: GapWarning[] = [];
  for (const candidate of candidates) {
    for (const old of candidate.supersedes) {
      const evidence = citedIn(old, specText);
      if (!evidence) continue;
      warnings.push({
        kind: "SUPERSEDED_CITATION",
        message: `${evidence} has been superseded by ${candidate.number}. Cite ${candidate.number} instead.`,
        evidence,
      });
    }
  }
  return warnings;
}

/**
 * Merge the deterministic version-resolution warnings with whatever the
 * reasoning step also proposed, deduplicating on (kind, evidence) so a model
 * that independently guessed the same superseded citation does not show up
 * twice in the UI. Deterministic warnings always win the slot — they are
 * listed first and are never dropped in favour of a model-proposed duplicate.
 */
export function mergeGapWarnings(
  deterministic: GapWarning[],
  modelProposed: GapWarning[],
): GapWarning[] {
  const seen = new Set(deterministic.map(warningKey));
  const merged = [...deterministic];
  for (const warning of modelProposed) {
    const key = warningKey(warning);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(warning);
  }
  return merged;
}

/**
 * Dedup key for a gap warning. `SUPERSEDED_CITATION` evidence is a BIS
 * designation, so it is keyed on its normalised, year-less form — the
 * deterministic path and a model-proposed duplicate can quote the same
 * citation with different formatting or a different edition year and still
 * collide on this key, rather than both surviving the merge as if they were
 * distinct warnings.
 */
function warningKey(warning: GapWarning): string {
  if (warning.kind === "SUPERSEDED_CITATION" && warning.evidence) {
    const normalized = normalizeDesignation(warning.evidence);
    if (normalized) return `${warning.kind}:${normalized}`;
  }
  return `${warning.kind}:${(warning.evidence ?? "").toLowerCase()}`;
}
