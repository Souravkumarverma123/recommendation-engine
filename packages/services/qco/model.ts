import { z } from "zod";

/**
 * Public I/O contract for the independent regulatory check (`qco.checkStatus`).
 *
 * Frozen day-1 shape (docs/PRD.md §tRPC API surface). The check is run
 * regardless of whether retrieval found the standard — a `VOLUNTARY` result
 * means "checked the QCO layer and confirmed not mandatory", never "did not
 * look" (docs/PRD.md §36, user story 12).
 */

/**
 * The regulatory badge.
 * - `MANDATORY` — an in-force QCO names this IS number.
 * - `UPCOMING` — a QCO names it but the enforcement date is still in the future.
 * - `VOLUNTARY` — checked, and no QCO applies. A positive, verified result.
 * - `NEEDS_REVIEW` — the product may fall under a scope-based "horizontal" QCO
 *   that cannot be resolved from the IS number alone; route to a human.
 */
export const regulatoryStatusSchema = z.enum([
  "MANDATORY",
  "UPCOMING",
  "VOLUNTARY",
  "NEEDS_REVIEW",
]);
export type RegulatoryStatus = z.infer<typeof regulatoryStatusSchema>;

export const qcoCheckStatusInputSchema = z.object({
  /** IS designation, any format `parseDesignation` accepts. */
  isNumber: z.string().trim().min(1).max(200),
  /**
   * The procurement text. Used only for the horizontal-QCO scope predicates —
   * the IS-number lookup does not need it. Omit and the check still runs.
   */
  productText: z.string().trim().max(8000).optional(),
});
export type QcoCheckStatusInput = z.input<typeof qcoCheckStatusInputSchema>;

/** Everything a procurement officer needs to cite the legal basis in a tender. */
export const qcoCitationSchema = z.object({
  title: z.string(),
  soNumbers: z.array(z.string()),
  soDates: z.array(z.string()),
  /** ISO date the obligation begins to bite; null for horizontal QCOs. */
  enforcementDate: z.string().nullable(),
  /** Certification scheme (I / II / IV / X); null for horizontal QCOs. */
  scheme: z.string().nullable(),
  /**
   * Rating/category condition (Scheme X) or phasing note — e.g. the Furniture
   * QCO's split large-enterprise / MSME enforcement dates. Free text; null when
   * the obligation applies unconditionally.
   */
  specificRequirement: z.string().nullable(),
  ministry: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  gazettePdfUrl: z.string().nullable(),
});
export type QcoCitation = z.infer<typeof qcoCitationSchema>;

export const qcoCheckStatusOutputSchema = z.object({
  status: regulatoryStatusSchema,
  /** Present for every status except `VOLUNTARY`. */
  qco: qcoCitationSchema.nullable(),
  /** Human-readable reason, set for `NEEDS_REVIEW`. */
  note: z.string().nullable(),
});
export type QcoCheckStatusOutput = z.infer<typeof qcoCheckStatusOutputSchema>;
