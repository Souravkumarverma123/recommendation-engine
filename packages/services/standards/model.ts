import { z } from "zod";

/**
 * Public I/O contract for the standards search seam (`standards.search`).
 *
 * Frozen day-1 shape (docs/PRD.md §tRPC API surface): input `{ query, limit? }`,
 * output a ranked list of catalogue matches carrying designation, title and
 * lifecycle status. Ticket #6 fills this with lexical (full-text) search;
 * ticket #7 fuses in pgvector results behind the same contract.
 */

export const standardsSearchInputSchema = z.object({
  /**
   * Plain-language description of what is being procured, or a designation.
   * Bound matches `recommend.run`'s `specText` so a multi-paragraph tender
   * clause passed straight through does not fail validation here. FTS and
   * `text-embedding-3-small` (8k-token limit) both handle text this long;
   * distilling the query to its salient terms is a later pipeline step.
   */
  query: z.string().trim().min(1).max(8000),
  /** How many ranked matches to return. The pipeline works on ~15 candidates. */
  limit: z.number().int().min(1).max(50).optional().default(15),
});
export type StandardsSearchInput = z.input<typeof standardsSearchInputSchema>;

/**
 * Lifecycle status, derived from the authoritative `standards.is_status` field
 * (2 = active/published, 5 = withdrawn/superseded — docs/research). `UNKNOWN`
 * covers seed rows and catalogue records where BIS left the field null.
 */
export const lifecycleStatusSchema = z.enum(["ACTIVE", "WITHDRAWN", "UNKNOWN"]);
export type LifecycleStatus = z.infer<typeof lifecycleStatusSchema>;

export const standardSearchHitSchema = z.object({
  /** Canonical designation as catalogued, e.g. "IS 456:2000". */
  number: z.string(),
  title: z.string(),
  /** Raw BIS lifecycle code, kept for callers that need the exact value. */
  isStatus: z.number().int().nullable(),
  lifecycleStatus: lifecycleStatusSchema,
  /** Relevance score from the retrieval layer; higher is better. Not a probability. */
  score: z.number(),
});
export type StandardSearchHit = z.infer<typeof standardSearchHitSchema>;

export const standardsSearchOutputSchema = z.object({
  results: z.array(standardSearchHitSchema),
});
export type StandardsSearchOutput = z.infer<typeof standardsSearchOutputSchema>;

/** Map the raw BIS `is_status` code onto the display-facing lifecycle enum. */
export function toLifecycleStatus(isStatus: number | null | undefined): LifecycleStatus {
  if (isStatus === 2) return "ACTIVE";
  if (isStatus === 5) return "WITHDRAWN";
  return "UNKNOWN";
}
