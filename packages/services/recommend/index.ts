/**
 * The recommendation pipeline (ticket #8 slice — docs/PRD.md §The recommendation
 * pipeline).
 *
 * Today: hybrid retrieval → independent QCO check per candidate → assembled
 * response. Steps 4–5 and 7–9 (LLM structured call, version resolution,
 * post-hoc verification) land in later tickets behind this same `run()` method
 * and its frozen contract.
 *
 * The regulatory badge on each result comes only from `QcoService.checkStatus`,
 * which queries the obligation data directly — the retrieval score never
 * influences it (docs/PRD.md §Architecture, user story 12).
 */
import { qcoService, QcoService } from "../qco";
import { standardsService, StandardsService } from "../standards";
import {
  recommendRunInputSchema,
  type RecommendRunInput,
  type RecommendRunOutput,
} from "./model";

export interface RecommendServiceDeps {
  standards?: StandardsService;
  qco?: QcoService;
}

export class RecommendService {
  private readonly standards: StandardsService;
  private readonly qco: QcoService;

  constructor(deps: RecommendServiceDeps = {}) {
    this.standards = deps.standards ?? standardsService;
    this.qco = deps.qco ?? qcoService;
  }

  async run(input: RecommendRunInput): Promise<RecommendRunOutput> {
    const { specText, language, limit } = recommendRunInputSchema.parse(input);

    const { results: hits } = await this.standards.search({ query: specText, limit });

    const results = await Promise.all(
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

    return { query: specText, language, results };
  }
}

export const recommendService = new RecommendService();
