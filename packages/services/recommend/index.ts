/**
 * The recommendation pipeline (docs/PRD.md §The recommendation pipeline).
 *
 * Today: language detection/normalisation → hybrid retrieval → version
 * resolution → independent QCO check per candidate → LLM reasoning (ranking,
 * role classification, evidence, gap warnings, draft clause) → post-hoc
 * verification → assembled response.
 *
 * Language detection is script-based (`recommend/language.ts`, ticket #13):
 * an explicit `language` hint always wins, otherwise Devanagari in `specText`
 * selects `"hi"`. A Hindi `specText` is translated to English *only* for the
 * retrieval and horizontal-QCO-scope calls (`normalizeForRetrieval`,
 * `llm/translation.ts`) — everything else, including the reasoner and
 * verbatim-evidence checking, still sees the officer's original text, so
 * standard designations stay canonical and evidence excerpts stay true
 * quotes regardless of query language (user stories 21-23).
 *
 * Version resolution runs first, ahead of the QCO check and the reasoner
 * (docs/PRD.md §Pipeline step 7, user stories 7-10, ticket #12): a withdrawn
 * hit is swapped for the catalogue edition that actually applies today
 * *before* anything downstream reads its regulatory status or hands it to the
 * model, so "OPC 43 grade to IS 8112" is checked and reasoned about as
 * IS 269:2015, not the dead citation.
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

import { defaultQueryTranslator, type QueryTranslator } from "../llm/translation";
import { qcoService, QcoService } from "../qco";
import { standardsService, StandardsService } from "../standards";
import type { StandardSearchHit } from "../standards/model";
import type { VersionResolution } from "../standards/version";
import { detectLanguage, isHindiScript } from "./language";
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
import { mergeGapWarnings, supersessionWarnings } from "./supersession";
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
  /**
   * Hindi → English query translation for retrieval (ticket #13). Defaults to
   * the OpenAI translator when `OPENAI_API_KEY` is set (never in tests —
   * inject a fake). `null` disables translation and a Hindi query searches
   * with its own (untranslated) text.
   */
  translator?: QueryTranslator | null;
}

/** A retrieved candidate with its independent regulatory verdict attached. */
type CheckedCandidate = Omit<
  RecommendedStandard,
  "role" | "reason" | "evidence" | "allied"
>;

/** A result before its allied standards are attached — the reasoning fields are set, `allied` is not. */
type PreAlliedResult = Omit<RecommendedStandard, "allied">;

/** A checked candidate with empty reasoning fields — the reasoner did not rank it (or did not run). */
function unreasoned(candidate: CheckedCandidate): PreAlliedResult {
  return { ...candidate, role: null, reason: null, evidence: [] };
}

export class RecommendService {
  private readonly standards: StandardsService;
  private readonly qco: QcoService;
  private readonly reasoner: RecommendationReasoner | null;
  private readonly translator: QueryTranslator | null;

  constructor(deps: RecommendServiceDeps = {}) {
    this.standards = deps.standards ?? standardsService;
    this.qco = deps.qco ?? qcoService;
    this.reasoner =
      deps.reasoner === undefined ? defaultRecommendationReasoner() : deps.reasoner;
    this.translator =
      deps.translator === undefined ? defaultQueryTranslator() : deps.translator;
  }

  async run(input: RecommendRunInput): Promise<RecommendRunOutput> {
    const { specText, language: languageHint, limit } = recommendRunInputSchema.parse(input);
    const language = languageHint ?? detectLanguage(specText);

    // Retrieval (lexical FTS + the concept embedder in tests) only knows
    // English; a Hindi requirement is translated for this call alone — the
    // original `specText` still drives everything downstream (docs/PRD.md
    // §Pipeline step 1, ticket #13). The QCO scope check below intentionally
    // keeps using `specText`, not this translated copy: its horizontal-QCO
    // predicates are English regexes that a Hindi query cannot reach either
    // way, and routing an independently-verified regulatory verdict through
    // an unverified translation would make MANDATORY/VOLUNTARY depend on
    // translation fidelity — exactly what `QcoService` is meant to be immune
    // to (docs/PRD.md §Architecture, user story 12).
    const retrievalText = await this.normalizeForRetrieval(specText);

    const { results: hits } = await this.standards.search({ query: retrievalText, limit });
    const { hits: resolvedHits, supersedesByNumber, concurrentByNumber } =
      await this.resolveHitVersions(hits);

    const checked: CheckedCandidate[] = await Promise.all(
      resolvedHits.map(async (hit) => {
        const check = await this.qco.checkStatus({
          isNumber: hit.number,
          productText: specText,
        });
        return {
          ...hit,
          regulatoryStatus: check.status,
          qco: check.qco,
          qcoNote: check.note,
          supersedes: supersedesByNumber.get(hit.number) ?? [],
          concurrentWith: concurrentByNumber.get(hit.number) ?? null,
        };
      }),
    );

    const reasoning = await this.reason(specText, language, checked);
    // Authoritative, independent of the reasoning step — drawn from `isStatus` /
    // `superseded_byis`, never guessed by the model (docs/PRD.md §Architecture).
    const versionWarnings = supersessionWarnings(checked, specText);

    if (!reasoning) {
      return {
        query: specText,
        language,
        results: await this.attachAllied(checked.map(unreasoned)),
        reasoned: false,
        requirementSummary: null,
        gapWarnings: versionWarnings,
        draftClause: null,
        conciseAnswer: null,
      };
    }

    const assembled = assembleResults(checked, reasoning.rankedStandards, specText);

    return {
      query: specText,
      language,
      results: await this.attachAllied(assembled),
      reasoned: true,
      requirementSummary: reasoning.requirementSummary,
      // Gap-warning evidence is subject to the same "must be from the input"
      // rule as per-standard evidence — null it out if the model did not quote.
      // The deterministic version-resolution warnings always take the slot over
      // a model-proposed duplicate for the same citation (mergeGapWarnings).
      gapWarnings: mergeGapWarnings(
        versionWarnings,
        reasoning.gapWarnings.map((warning) => ({
          ...warning,
          evidence:
            warning.evidence && verbatimExcerpts([warning.evidence], specText).length > 0
              ? warning.evidence
              : null,
        })),
      ),
      // The clause and the concise answer are free-text prose, not covered by
      // the ranked-number schema constraint, so each is verified independently
      // against `assembled` — the standards the reasoner actually kept — not
      // `checked` (every retrieved candidate). A candidate the reasoner
      // dropped as inapplicable is exactly what this prose must not name;
      // checking against the wider retrieval set would let it back in
      // (docs/PRD.md user story 27).
      draftClause: citesOnlyCandidates(reasoning.draftClause, assembled)
        ? reasoning.draftClause
        : null,
      conciseAnswer: citesOnlyCandidates(reasoning.conciseAnswer, assembled)
        ? reasoning.conciseAnswer
        : null,
    };
  }

  /**
   * An English copy of a Hindi query for retrieval (ticket #13). A no-op for
   * text that is not Hindi-scripted. Standard designations are ASCII already
   * and pass through untouched; only the surrounding Hindi prose is
   * translated. A missing translator, a failed call, or a translation that
   * collapses to nothing usable (a query built entirely from function words
   * the translator drops) all degrade to searching with the original text —
   * `standardsSearchInputSchema` requires a non-empty query, and a Hindi
   * query still reaches the concept embedder's real multilingual counterpart
   * in production (`text-embedding-3-small`) regardless, so this is a
   * best-effort boost to recall, not a hard dependency.
   */
  private async normalizeForRetrieval(specText: string): Promise<string> {
    if (!this.translator || !isHindiScript(specText)) return specText;

    try {
      const translated = await this.translator.translateToEnglish(specText);
      return translated.trim().length > 0 ? translated : specText;
    } catch (error) {
      console.error(
        "recommend.run: query translation failed, searching with the original text —",
        error instanceof Error ? error.message : String(error),
      );
      return specText;
    }
  }

  /**
   * Resolve each retrieved hit to its current edition (docs/PRD.md §Pipeline
   * step 7). Runs before the QCO check and the reasoner see the hits, so a
   * withdrawn citation is checked and reasoned about as the standard that
   * actually applies today. Two hits that resolve to the same current edition
   * (a withdrawn one and its already-current successor both matching
   * retrieval) are merged, keeping the better retrieval score. A resolution
   * failure degrades to the hits as retrieved — the ranked list matters more
   * than the version note.
   */
  private async resolveHitVersions(hits: StandardSearchHit[]): Promise<{
    hits: StandardSearchHit[];
    supersedesByNumber: Map<string, string[]>;
    concurrentByNumber: Map<string, NonNullable<RecommendedStandard["concurrentWith"]>>;
  }> {
    const supersedesByNumber = new Map<string, string[]>();
    const concurrentByNumber = new Map<
      string,
      NonNullable<RecommendedStandard["concurrentWith"]>
    >();

    let versions: Map<string, VersionResolution>;
    try {
      versions = await this.standards.resolveVersions(hits.map((h) => h.number));
    } catch (error) {
      console.error(
        "recommend.run: version resolution failed, keeping retrieved editions as-is —",
        error instanceof Error ? error.message : String(error),
      );
      return { hits, supersedesByNumber, concurrentByNumber };
    }

    const merged = new Map<string, StandardSearchHit>();
    for (const hit of hits) {
      const resolution = versions.get(hit.number);
      const target: StandardSearchHit = resolution
        ? {
            number: resolution.current.number,
            title: resolution.current.title,
            isStatus: resolution.current.isStatus,
            lifecycleStatus: resolution.current.lifecycleStatus,
            score: hit.score,
          }
        : hit;

      const existing = merged.get(target.number);
      merged.set(target.number, {
        ...target,
        score: Math.max(existing?.score ?? -Infinity, target.score),
      });

      if (resolution && resolution.supersedes.length > 0) {
        const acc = supersedesByNumber.get(resolution.current.number) ?? [];
        supersedesByNumber.set(resolution.current.number, [
          ...new Set([...acc, ...resolution.supersedes]),
        ]);
      }
      // First hit to report a concurrent companion for a given current edition
      // wins the slot — deterministic by retrieval order rather than silently
      // overwritten by whichever hit happens to be processed last.
      if (resolution?.concurrentWith && !concurrentByNumber.has(resolution.current.number)) {
        concurrentByNumber.set(resolution.current.number, resolution.concurrentWith);
      }
    }

    return { hits: [...merged.values()], supersedesByNumber, concurrentByNumber };
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

  /**
   * Attach each result's allied standards (docs/PRD.md pipeline step 4). One
   * graph query for the whole result set; a walk failure degrades to no allied
   * standards rather than failing the recommendation — the ranked list and the
   * regulatory badges matter more.
   */
  private async attachAllied(
    results: PreAlliedResult[],
  ): Promise<RecommendedStandard[]> {
    let alliedByNumber: Map<string, RecommendedStandard["allied"]>;
    try {
      alliedByNumber = await this.standards.allied(results.map((r) => r.number));
    } catch (error) {
      console.error(
        "recommend.run: allied-standards walk failed, returning results without them —",
        error instanceof Error ? error.message : String(error),
      );
      alliedByNumber = new Map();
    }

    return results.map((result) => ({
      ...result,
      allied: alliedByNumber.get(result.number) ?? [],
    }));
  }
}

/**
 * Merge the retrieved+checked candidates with the reasoning step's ranking.
 * Only candidates the reasoner actually ranked as applicable — and that
 * survive verification — are returned, in the model's ranked order. The
 * reasoner is explicitly instructed to omit candidates that do not directly
 * answer the requirement (`reasoner.ts` rule 2); a candidate it left out is
 * retrieval noise (e.g. a broad lexical-fallback match) rather than something
 * the officer asked about, so it is dropped here instead of being
 * re-appended with an empty role.
 */
function assembleResults(
  checked: CheckedCandidate[],
  ranked: ReasonedStandard[],
  specText: string,
): PreAlliedResult[] {
  const used = new Set<string>();
  const results: PreAlliedResult[] = [];

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

  return results;
}

export const recommendService = new RecommendService();
