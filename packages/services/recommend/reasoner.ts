/**
 * The LLM reasoning step of the recommendation pipeline (ticket #10,
 * docs/PRD.md §Pipeline step 5).
 *
 * Given the procurement requirement and the ~15 retrieved candidates — each
 * already carrying its authoritative lifecycle status and its independently
 * checked regulatory verdict — the model produces the *reasoning* layer:
 *
 *   - a plain-language paraphrase of what is being procured,
 *   - a ranking of the candidates with a per-candidate role classification,
 *   - the phrase(s) from the officer's own input that triggered each pick,
 *   - gap warnings about the draft spec (brand names, a foreign/ISO standard
 *     cited where an Indian Standard exists, non-metric units, a superseded
 *     citation),
 *   - ready-to-paste tender clause language.
 *
 * The model *proposes*; the data layer still decides. It is constrained so
 * every designation it emits is one of the supplied candidates
 * (`recommendationReasoningSchema` + the strict JSON-schema response format),
 * and `RecommendService` re-verifies that constraint after the call
 * (docs/PRD.md §Pipeline step 8). It never sets the regulatory badge — that is
 * read only from `QcoService` (user story 12) and merely handed to the model as
 * context so the draft clause is worded correctly.
 *
 * The rest of the pipeline depends only on the {@link RecommendationReasoner}
 * interface — one method, `reason(input) => reasoning`. Production wires
 * {@link OpenAIRecommendationReasoner} (`gpt-5-mini`); the `recommend.run` seam
 * test injects a deterministic fake (packages/services/test/fake-reasoner.ts) so
 * there is no network, no spend and no flakiness (docs/PRD.md §Testing Decisions).
 */
import { z } from "zod";

import type { LifecycleStatus } from "../standards/model";
import type { RegulatoryStatus } from "../qco/model";
import { env } from "../env";

/** OpenAI reasoning model, frozen day 1 (docs/PRD.md §Pipeline step 5). */
export const REASONING_MODEL = "gpt-5-mini";

/**
 * How long to wait for the reasoning call before abandoning it. A hung
 * connection must not hold `recommend.run` open — on timeout the request aborts,
 * the service catches it and returns retrieval-ordered results instead.
 *
 * Measured at ~40s for a 13-candidate batch with `gpt-5-mini`'s default
 * reasoning effort once the reasoner started emitting `conciseAnswer` too
 * (extra output tokens on every call) — the previous 20s bound was tripping
 * on essentially every real request, silently degrading to the unfiltered
 * retrieval list this same change was meant to stop showing.
 */
export const REASONING_TIMEOUT_MS = 45_000;

/**
 * Where a standard sits relative to the requirement. `PRIMARY` is the product
 * or design standard the tender is really about; the rest are the companions a
 * complete specification also has to name (docs/PRD.md user story 19).
 */
export const standardRoleSchema = z.enum([
  "PRIMARY",
  "NORMATIVE_REFERENCE",
  "TEST_METHOD",
  "SAFETY",
  "TERMINOLOGY",
  "INSTALLATION",
  "RELATED",
]);
export type StandardRole = z.infer<typeof standardRoleSchema>;

/** The kinds of draft-spec defect the model is asked to flag (docs/PRD.md §Solution). */
export const gapWarningKindSchema = z.enum([
  "BRAND_NAME",
  "FOREIGN_STANDARD",
  "NON_METRIC_UNIT",
  "SUPERSEDED_CITATION",
  "MISSING_PARAMETER",
  "OTHER",
]);
export type GapWarningKind = z.infer<typeof gapWarningKindSchema>;

export const gapWarningSchema = z.object({
  kind: gapWarningKindSchema,
  /** One sentence a procurement officer can act on. */
  message: z.string(),
  /** The verbatim phrase in the officer's input this is about; null if general. */
  evidence: z.string().nullable(),
});
export type GapWarning = z.infer<typeof gapWarningSchema>;

export const reasonedStandardSchema = z.object({
  /** MUST be the designation of one of the supplied candidates, verbatim. */
  number: z.string(),
  role: standardRoleSchema,
  /** Plain-language why-this-standard, in the requested language. */
  reason: z.string(),
  /** Verbatim excerpt(s) from the officer's input that triggered this pick. */
  evidence: z.array(z.string()),
});
export type ReasonedStandard = z.infer<typeof reasonedStandardSchema>;

export const recommendationReasoningSchema = z.object({
  /** Plain-language paraphrase of what is being procured (requested language). */
  requirementSummary: z.string(),
  /** The candidates, ranked best-first. May omit candidates that do not apply. */
  rankedStandards: z.array(reasonedStandardSchema),
  gapWarnings: z.array(gapWarningSchema),
  /** Ready-to-paste tender clause language for the primary standard. */
  draftClause: z.string(),
  /** Short 2-3 sentence answer in the requested language, directly answering what was asked. */
  conciseAnswer: z.string(),
});
export type RecommendationReasoning = z.infer<typeof recommendationReasoningSchema>;

/** One retrieved candidate, as handed to the model. */
export interface ReasonerCandidate {
  number: string;
  title: string;
  typeOfStandard: string | null;
  lifecycleStatus: LifecycleStatus;
  /** Authoritative verdict from `QcoService` — context only, never the model's to change. */
  regulatoryStatus: RegulatoryStatus;
  /** Team-written scope paraphrase; never IS body text (BIS Act 2016 s.11). */
  summary: string | null;
}

export interface ReasonerInput {
  specText: string;
  language: "en" | "hi";
  candidates: ReasonerCandidate[];
}

export interface RecommendationReasoner {
  reason(input: ReasonerInput): Promise<RecommendationReasoning>;
}

const SYSTEM_PROMPT = [
  "You assist an Indian government procurement officer drafting a tender.",
  "You are given a procurement requirement and a numbered list of candidate Indian Standards retrieved from the BIS catalogue.",
  "Your job is reasoning only — ranking, role classification, evidence, gap warnings, draft clause language and a concise answer.",
  "",
  "Hard rules:",
  "1. Every `number` you emit MUST be copied verbatim from a candidate's designation. Never invent, correct or reformat a designation, and never cite a standard that is not in the list.",
  "2. Rank ONLY candidates that directly answer what the officer asked, best first. Be strict — drop any candidate that is only loosely or tangentially related. Never pad the list with unrelated standards. If the officer asks about X, return only standards for X — do not add standards for other topics that were not asked about.",
  "3. Classify each ranked standard's role: PRIMARY (the product/design standard the tender is about), NORMATIVE_REFERENCE, TEST_METHOD, SAFETY, TERMINOLOGY, INSTALLATION, or RELATED.",
  "4. `evidence` for each standard must be verbatim substrings of the officer's input — the phrases that triggered the pick. If nothing in the input specifically triggered it, use an empty list.",
  "5. Gap warnings describe defects in the officer's draft: BRAND_NAME (a proprietary/brand term), FOREIGN_STANDARD (an ISO/IEC/ASTM/EN/BS/DIN standard cited where an Indian Standard exists), NON_METRIC_UNIT, SUPERSEDED_CITATION (the input cites a standard shown as withdrawn), MISSING_PARAMETER, or OTHER. `evidence` must be a verbatim substring of the input, or null.",
  "6. The regulatory status of each candidate is authoritative and already decided — do not contradict it. Word the draft clause to match: for MANDATORY or UPCOMING, require the BIS Standard Mark under licence; for VOLUNTARY, require conformity to the standard with no certification-mark language; for NEEDS_REVIEW, note that certification applicability needs confirmation.",
  "7. Write `requirementSummary`, `reason`, `message`, `draftClause` and `conciseAnswer` in the requested language. Keep every standard designation and title in its canonical form regardless of language.",
  "8. `conciseAnswer` must be a short, clear 2-3 sentence summary in the requested language that directly answers only what was asked, in plain officer-friendly language. Reference the primary standard by number, state its key point and certification position in one line, and do not mention standards you dropped. Keep it under 70 words.",
].join("\n");

interface OpenAIChatResponse {
  choices?: { message?: { content?: string | null } }[];
}

/**
 * Calls the OpenAI Chat Completions endpoint with a strict JSON-schema response
 * format, so the model can only return an object matching
 * {@link recommendationReasoningSchema}. No SDK dependency — the same direct
 * `fetch` style as {@link OpenAIEmbeddingProvider}. Not exercised in CI (the
 * seam test injects the fake); kept small and defensive.
 */
export class OpenAIRecommendationReasoner implements RecommendationReasoner {
  private readonly endpoint = "https://api.openai.com/v1/chat/completions";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = REASONING_MODEL,
  ) {}

  async reason(input: ReasonerInput): Promise<RecommendationReasoning> {
    // Constrain every `number` the model can emit to a candidate designation at
    // the schema level — the strongest form of the "only from the candidate set"
    // rule. `RecommendService` still re-verifies (docs/PRD.md §Pipeline step 8).
    const schema = z.toJSONSchema(responseSchemaFor(input.candidates), {
      target: "draft-2020-12",
    });

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "recommendation_reasoning",
            strict: true,
            schema,
          },
        },
      }),
      signal: AbortSignal.timeout(REASONING_TIMEOUT_MS),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI reasoning request failed (${res.status}): ${detail}`);
    }

    const body = (await res.json()) as OpenAIChatResponse;
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI reasoning response had no content");

    return recommendationReasoningSchema.parse(JSON.parse(content));
  }
}

/**
 * The reasoning schema with `rankedStandards[].number` narrowed to the exact
 * candidate designations, so the strict JSON-schema response format cannot let
 * the model name a standard outside the retrieved set. Falls back to the open
 * `z.string()` shape when there are no candidates (`z.enum` needs one value).
 */
export function responseSchemaFor(candidates: ReasonerCandidate[]) {
  const numbers = candidates.map((c) => c.number);
  if (numbers.length === 0) return recommendationReasoningSchema;

  return recommendationReasoningSchema.extend({
    rankedStandards: z.array(
      reasonedStandardSchema.extend({
        number: z.enum(numbers as [string, ...string[]]),
      }),
    ),
  });
}

/** The requirement + the candidate table, as a single user turn. */
export function buildUserPrompt(input: ReasonerInput): string {
  const candidates = input.candidates
    .map((c, i) => {
      const bits = [
        `${i + 1}. ${c.number} — ${c.title}`,
        `   type: ${c.typeOfStandard ?? "unknown"} · lifecycle: ${c.lifecycleStatus} · regulatory: ${c.regulatoryStatus}`,
      ];
      if (c.summary) bits.push(`   scope: ${c.summary}`);
      return bits.join("\n");
    })
    .join("\n");

  return [
    `Response language: ${input.language}`,
    "",
    "Procurement requirement:",
    input.specText,
    "",
    "Candidate Indian Standards:",
    candidates,
  ].join("\n");
}

/**
 * The configured reasoner, or `null` when `OPENAI_API_KEY` is unset — the
 * pipeline then returns retrieval-ordered results with no reasoning layer
 * rather than failing (docs/PRD.md §Data strategy — a bare seed still works).
 *
 * Returns `null` under Vitest unconditionally, mirroring
 * {@link defaultEmbeddingProvider}: seam tests inject the deterministic fake,
 * and a forgotten injection must degrade, never reach the network.
 */
export function defaultRecommendationReasoner(): RecommendationReasoner | null {
  if (process.env.VITEST) return null;
  return env.OPENAI_API_KEY ? new OpenAIRecommendationReasoner(env.OPENAI_API_KEY) : null;
}
