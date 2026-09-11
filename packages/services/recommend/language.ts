/**
 * Language detection for `recommend.run` (ticket #13, docs/PRD.md §Pipeline
 * step 1 — "Normalise / detect language", user story 21).
 *
 * The officer is never asked to pick a language — the UI has one free-text
 * box (`apps/web/app/_components/recommendation-search.tsx`). Detection is
 * script-based, not a language-ID model: Hindi procurement text is written in
 * Devanagari, so the presence of a single Devanagari codepoint is a reliable
 * signal, and English/BIS designations ("IS 456:2000") never contain one.
 *
 * `RecommendService.run` uses this to fill in `language` when the caller does
 * not pass an explicit hint, and independently to decide whether the query
 * needs retrieval normalisation (`llm/translation.ts`) — the two are related
 * but not the same question: a caller could ask for a Hindi *response* to an
 * English requirement, in which case retrieval needs no translation at all.
 */

/** Devanagari block (U+0900–U+097F) — covers Hindi. */
const DEVANAGARI_RE = /[ऀ-ॿ]/;

/** `true` when `text` contains any Devanagari script. */
export function isHindiScript(text: string): boolean {
  return DEVANAGARI_RE.test(text);
}

/** Best-effort response language for text with no explicit hint. */
export function detectLanguage(text: string): "en" | "hi" {
  return isHindiScript(text) ? "hi" : "en";
}
