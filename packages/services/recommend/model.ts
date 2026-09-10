import { z } from "zod";

import { standardSearchHitSchema } from "../standards/model";
import { qcoCitationSchema, regulatoryStatusSchema } from "../qco/model";

/**
 * Public I/O contract for `recommend.run` (docs/PRD.md §tRPC API surface).
 *
 * Ticket #8 delivers the first slice: ranked applicable standards, each with its
 * lifecycle status and an independently-checked regulatory badge + QCO
 * citation. No LLM step yet — the ranking is the hybrid retrieval order. Later
 * tickets add the structured LLM call (role classification, evidence excerpts,
 * gap warnings, draft clause) behind this same route.
 */

export const recommendRunInputSchema = z.object({
  /** The procurement requirement — a product description, spec, or tender clause. */
  specText: z.string().trim().min(1).max(8000),
  /** Response language. Echoed back today; translation is a later ticket. */
  language: z.enum(["en", "hi"]).optional().default("en"),
  /** How many ranked standards to return. */
  limit: z.number().int().min(1).max(50).optional().default(15),
});
export type RecommendRunInput = z.input<typeof recommendRunInputSchema>;

export const recommendedStandardSchema = standardSearchHitSchema.extend({
  /** Independent QCO verdict — never inferred from retrieval. */
  regulatoryStatus: regulatoryStatusSchema,
  /** Citation for the badge; null when `VOLUNTARY`. */
  qco: qcoCitationSchema.nullable(),
  /** Reason string, set when `regulatoryStatus` is `NEEDS_REVIEW`. */
  qcoNote: z.string().nullable(),
});
export type RecommendedStandard = z.infer<typeof recommendedStandardSchema>;

export const recommendRunOutputSchema = z.object({
  query: z.string(),
  language: z.enum(["en", "hi"]),
  results: z.array(recommendedStandardSchema),
});
export type RecommendRunOutput = z.infer<typeof recommendRunOutputSchema>;
