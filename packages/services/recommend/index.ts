/**
 * The recommendation pipeline (docs/PRD.md §The recommendation pipeline).
 *
 * Today: hybrid retrieval → independent QCO check per candidate → LLM reasoning
 * (ranking, role classification, evidence, gap warnings, draft clause) →
 * post-hoc verification → assembled response. Version resolution (step 7)
 * lands in a later ticket behind this same `run()` method and its frozen
 * contract.
 *
 * The regulatory badge on each result comes only from `QcoService.checkStatus`,
 * which queries the obligation data directly — neither the retrieval score nor
 * the language model influences it (docs/PRD.md §Architecture, user story 12).
 * The reasoner *proposes* a ranking and prose; `verify.ts` then drops anything
 * it emitted that does not trace back to a retrieved candidate or was not
 * quoted verbatim from the officer's input.
 */
import { db, inArray } from "@repo/database";
import { standardsTable } from "@repo/database/schema";

import { qcoService, QcoService } from "../qco";
import { standardsService, StandardsService } from "../standards";
import {
  recommendRunInputSchema,
  type RecommendedStandard,
  type RecommendRunInput,
  type RecommendRunOutput,
} from "./model";
import {
  defaultRecommendationReasoner,
  type RecommendationReasoner,
  type RecommendationReasoning,
  type ReasonerCandidate,
  type ReasonedStandard,
} from "./reasoner";
import { citesOnlyCandidates, traceToCandidate, verbatimExcerpts } from "./verify";

export interface RecommendServiceDeps {
  standards?: StandardsService;
  qco?: QcoService;
  /**
   * The LLM reasoning step. Defaults to the OpenAI reasoner when
   * `OPENAI_API_KEY` is set (never in tests — inject a fake). `null` disables
   * reasoning and `run()` returns retrieval-ordered results.
   */
  reasoner?: RecommendationReasoner | null;
}

/** A retrieved candidate with its independent regulatory verdict attached. */
type CheckedCandidate = Omit<RecommendedStandard, "role" | "reason" | "evidence">;

/** A checked candidate with empty reasoning fields — the reasoner did not rank it (or did not run). */
function unreasoned(candidate: CheckedCandidate): RecommendedStandard {
  return { ...candidate, role: null, reason: null, evidence: [] };
}

export class RecommendService {
  private readonly standards: StandardsService;
  private readonly qco: QcoService;
  private readonly reasoner: RecommendationReasoner | null;

  constructor(deps: RecommendServiceDeps = {}) {
    this.standards = deps.standards ?? standardsService;
    this.qco = deps.qco ?? qcoService;
    this.reasoner =
      deps.reasoner === undefined ? defaultRecommendationReasoner() : deps.reasoner;
  }

  async run(input: RecommendRunInput): Promise<RecommendRunOutput> {
    const { specText, language, limit } = recommendRunInputSchema.parse(input);

    const { results: hits } = await this.standards.search({ query: specText, limit });

    const checked: CheckedCandidate[] = await Promise.all(
      hits.map(async (hit) => {
        const check = await this.qco.checkStatus({
          isNumber: hit.number,
          productText: specText,
        });
        return {
          ...hit,
          regulatoryStatus: check.status,
          qco: check.qco,
          qcoNote: check.note,
        };
      }),
    );

    const reasoning = await this.reason(specText, language, checked);

    if (!reasoning) {
      return {
        query: specText,
        language,
        results: checked.map(unreasoned),
        reasoned: false,
        requirementSummary: null,
        gapWarnings: [],
        draftClause: null,
      };
    }

    return {
      query: specText,
      language,
      results: assembleResults(checked, reasoning.rankedStandards, specText),
      reasoned: true,
      requirementSummary: reasoning.requirementSummary,
      // Gap-warning evidence is subject to the same "must be from the input"
      // rule as per-standard evidence — null it out if the model did not quote.
      gapWarnings: reasoning.gapWarnings.map((warning) => ({
        ...warning,
        evidence:
          warning.evidence && verbatimExcerpts([warning.evidence], specText).length > 0
            ? warning.evidence
            : null,
      })),
      // The clause is paste-into-a-tender prose and is not covered by the
      // ranked-number schema constraint — drop it entirely if it names any
      // standard outside the retrieved candidate set (docs/PRD.md user story 27).
      draftClause: citesOnlyCandidates(reasoning.draftClause, checked)
        ? reasoning.draftClause
        : null,
    };
  }

  /** Run the reasoner, degrading to `null` (retrieval-only) on any failure. */
  private async reason(
    specText: string,
    language: "en" | "hi",
    checked: CheckedCandidate[],
  ): Promise<RecommendationReasoning | null> {
    if (!this.reasoner || checked.length === 0) return null;

    try {
      // Enrich the retrieval hits with the reviewed scope summary and standard
      // type — the reasoner classifies roles and quotes evidence far better with
      // them, and neither is on the lean `standards.search` hit. Inside the
      // try: a metadata-query failure degrades to retrieval-only, as documented.
      const meta = await db
        .select({
          number: standardsTable.number,
          typeOfStandard: standardsTable.typeOfStandard,
          summary: standardsTable.summary,
        })
        .from(standardsTable)
        .where(
          inArray(
            standardsTable.number,
            checked.map((c) => c.number),
          ),
        );
      const metaByNumber = new Map(meta.map((row) => [row.number, row]));

      const candidates: ReasonerCandidate[] = checked.map((c) => ({
        number: c.number,
        title: c.title,
        typeOfStandard: metaByNumber.get(c.number)?.typeOfStandard ?? null,
        lifecycleStatus: c.lifecycleStatus,
        regulatoryStatus: c.regulatoryStatus,
        summary: metaByNumber.get(c.number)?.summary ?? null,
      }));

      return await this.reasoner.reason({ specText, language, candidates });
    } catch (error) {
      console.error(
        "recommend.run: reasoning step failed, returning retrieval order —",
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }
}

/**
 * Merge the retrieved+checked candidates with the reasoning step's ranking.
 * Order follows the model's ranking for the standards it ranked *and* that
 * survive verification; candidates it did not rank are appended in retrieval
 * order so their independent regulatory badge is never lost.
 */
function assembleResults(
  checked: CheckedCandidate[],
  ranked: ReasonedStandard[],
  specText: string,
): RecommendedStandard[] {
  const used = new Set<string>();
  const results: RecommendedStandard[] = [];

  for (const entry of ranked) {
    const candidate = traceToCandidate(entry.number, checked);
    if (!candidate || used.has(candidate.number)) {
      if (!candidate) {
        console.warn(
          `recommend.run: dropped "${entry.number}" — not traceable to a retrieved candidate`,
        );
      }
      continue;
    }
    used.add(candidate.number);
    results.push({
      ...candidate,
      role: entry.role,
      reason: entry.reason,
      evidence: verbatimExcerpts(entry.evidence, specText),
    });
  }

  for (const candidate of checked) {
    if (used.has(candidate.number)) continue;
    results.push(unreasoned(candidate));
  }

  return results;
}

export const recommendService = new RecommendService();
