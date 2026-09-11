import { z } from "zod";

import { standardSearchHitSchema } from "../standards/model";
import { alliedStandardSchema } from "../standards/allied";
import { qcoCitationSchema, regulatoryStatusSchema } from "../qco/model";
import {
  gapWarningSchema,
  standardRoleSchema,
} from "./reasoner";

/**
 * Public I/O contract for `recommend.run` (docs/PRD.md §tRPC API surface).
 *
 * Ticket #8 delivered the first slice: ranked applicable standards, each with
 * its lifecycle status and an independently-checked regulatory badge + QCO
 * citation. Ticket #10 adds the LLM reasoning layer behind the same route — a
 * per-result role and plain-language reason, the evidence excerpts from the
 * officer's own input, gap warnings about the draft spec, and ready-to-paste
 * draft clause language. The reasoning fields are nullable / empty when the
 * reasoner is unavailable (no `OPENAI_API_KEY`): retrieval still answers.
 */

export const recommendRunInputSchema = z.object({
  /** The procurement requirement — a product description, spec, or tender clause. */
  specText: z.string().trim().min(1).max(8000),
  /**
   * Response language. Optional — when omitted, `RecommendService.run`
   * detects it from `specText` (Devanagari script → `"hi"`, else `"en"`;
   * `recommend/language.ts`, ticket #13). An explicit hint always wins over
   * detection, e.g. to ask for an English response to a Hindi requirement.
   */
  language: z.enum(["en", "hi"]).optional(),
  /** How many ranked standards to return. */
  limit: z.number().int().min(1).max(50).optional().default(15),
});
export type RecommendRunInput = z.input<typeof recommendRunInputSchema>;

export const recommendedStandardSchema = standardSearchHitSchema.extend({
  /** Independent QCO verdict — never inferred from retrieval or the LLM. */
  regulatoryStatus: regulatoryStatusSchema,
  /** Citation for the badge; null when `VOLUNTARY`. */
  qco: qcoCitationSchema.nullable(),
  /** Reason string, set when `regulatoryStatus` is `NEEDS_REVIEW`. */
  qcoNote: z.string().nullable(),
  /**
   * Where this standard sits relative to the requirement, from the reasoning
   * step. `null` when the reasoner did not run or did not rank this candidate.
   */
  role: standardRoleSchema.nullable(),
  /** Plain-language why-this-standard, in the requested language; null when unreasoned. */
  reason: z.string().nullable(),
  /**
   * Verbatim excerpt(s) from the officer's input that triggered this pick.
   * Post-verified against `specText` — anything the model did not quote
   * verbatim is dropped. Empty when the reasoner did not run.
   */
  evidence: z.array(z.string()),
  /**
   * The standards this one depends on — its normative references, test methods,
   * safety and terminology companions — found by walking the `REFERS_TO` and
   * `PART_OF` edges out of it, each tagged by role (ticket #11). Empty when the
   * standard has no ingested allied standards (the graph is only harvested for
   * the demo slice).
   */
  allied: z.array(alliedStandardSchema),
  /**
   * Withdrawn designations this result stands in for — the officer may have
   * cited one of these; version resolution (ticket #12) walked `isStatus` /
   * `superseded_byis` to the edition that actually applies today. Empty when
   * this result needed no resolution.
   */
  supersedes: z.array(z.string()),
  /**
   * An earlier edition still valid alongside this one, with the date its own
   * validity ends — set only when BIS lists both as concurrently running
   * (docs/PRD.md user story 10). `null` otherwise.
   */
  concurrentWith: z
    .object({ number: z.string(), title: z.string(), validUntil: z.string() })
    .nullable(),
});
export type RecommendedStandard = z.infer<typeof recommendedStandardSchema>;

export const recommendRunOutputSchema = z.object({
  query: z.string(),
  language: z.enum(["en", "hi"]),
  /**
   * Ranked by the reasoning step when it ran, limited to the candidates it
   * judged applicable to the requirement — a candidate it left unranked is
   * retrieval noise, not a match, and is dropped rather than shown with an
   * empty role. In retrieval order, unfiltered, when reasoning did not run.
   */
  results: z.array(recommendedStandardSchema),
  /** Whether the LLM reasoning layer ran. `false` → the fields below are empty. */
  reasoned: z.boolean(),
  /** Plain-language paraphrase of what is being procured; null when unreasoned. */
  requirementSummary: z.string().nullable(),
  /** Defects flagged in the officer's draft spec. Empty when unreasoned. */
  gapWarnings: z.array(gapWarningSchema),
  /** Ready-to-paste tender clause language for the primary standard; null when unreasoned. */
  draftClause: z.string().nullable(),
  /** Short 2-3 sentence answer directly addressing what was asked; null when unreasoned. */
  conciseAnswer: z.string().nullable(),
});
export type RecommendRunOutput = z.infer<typeof recommendRunOutputSchema>;
