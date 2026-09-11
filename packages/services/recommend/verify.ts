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

/** Lowercase and collapse whitespace for a lenient substring comparison. */
function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Keep only the excerpts the model actually lifted from `sourceText`. Comparison
 * is case- and whitespace-insensitive; duplicates are removed. A paraphrase or
 * an invented quote is dropped — "evidence excerpts drawn from the input" is a
 * hard contract (user story 5).
 */
export function verbatimExcerpts(quotes: string[], sourceText: string): string[] {
  const haystack = normalizeForMatch(sourceText);
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const quote of quotes) {
    const trimmed = quote.trim();
    if (!trimmed) continue;
    const normalized = normalizeForMatch(trimmed);
    if (seen.has(normalized) || !haystack.includes(normalized)) continue;
    seen.add(normalized);
    kept.push(trimmed);
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
