/**
 * Post-hoc verification of the reasoning step's output (docs/PRD.md §Pipeline
 * step 8, user story 27).
 *
 * The model is *asked* to only emit designations from the candidate set and to
 * quote the officer's input verbatim. These functions enforce it after the
 * fact, so a hallucinated citation or an invented "evidence" excerpt can never
 * reach a tender — the system is structurally unable to paste a fabricated
 * standard number.
 *
 * Pure — no DB, no network. Exercised through the `recommend.run` seam and
 * directly in verify.test.ts.
 */
import { sameStandard } from "../bis/designation";

/**
 * The span of `sourceText` that matches `quote`, or `null` if there is none.
 * The match ignores case and treats any run of the quote's whitespace as any
 * run of whitespace, but what comes back is the text exactly as the officer
 * wrote it — never the model's copy of it.
 */
function sourceSpanFor(quote: string, sourceText: string): string | null {
  const trimmed = quote.trim();
  if (!trimmed) return null;
  const pattern = trimmed
    .split(/\s+/)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const match = new RegExp(pattern, "i").exec(sourceText);
  return match ? match[0] : null;
}

/**
 * Keep only the excerpts the model actually lifted from `sourceText`, returned
 * as the officer's own text (see {@link sourceSpanFor}) so a re-cased or
 * re-spaced quote is never shown as if copied. Duplicates are removed; a
 * paraphrase or an invented quote is dropped — "evidence excerpts drawn from
 * the input" is a hard contract (user story 5).
 */
export function verbatimExcerpts(quotes: string[], sourceText: string): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const quote of quotes) {
    const span = sourceSpanFor(quote, sourceText);
    if (!span) continue;
    const key = span.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(span);
  }

  return kept;
}

/**
 * The candidate a model-emitted designation traces back to, or `null` when it
 * traces to none. Matched on the standard identity (series + number + part +
 * section), so "IS 456 : 2000" and "IS 456:2000" are the same standard. Every
 * candidate came from the `standards` table, so a trace also proves existence.
 */
export function traceToCandidate<T extends { number: string }>(
  emittedNumber: string,
  candidates: readonly T[],
): T | null {
  return candidates.find((candidate) => sameStandard(candidate.number, emittedNumber)) ?? null;
}

/** A BIS-designation-shaped run inside free prose: "IS 456", "IS 1489 (Part 1) : 1991", "IS/IEC 62368-1:2023". */
const DESIGNATION_IN_PROSE_RE =
  /\b(?:IS|SP)(?:\s*\/\s*(?:ISO|IEC))*\s*\d{1,5}(?:\s*\(\s*Part[^)]*\))?(?:\s*:\s*\d{4})?/gi;

/**
 * True when every BIS designation named in `prose` traces back to one of
 * `candidates`. The reasoning step's free-text fields (the draft clause above
 * all) are not covered by the ranked-number schema constraint, so a model could
 * slip an unlisted or invented standard into a clause an officer then pastes
 * into a tender. Prose that cites only retrieved candidates — or none at all —
 * passes (docs/PRD.md user story 27).
 */
export function citesOnlyCandidates(
  prose: string,
  candidates: readonly { number: string }[],
): boolean {
  const cited = prose.match(DESIGNATION_IN_PROSE_RE) ?? [];
  return cited.every((token) => traceToCandidate(token, candidates) !== null);
}
