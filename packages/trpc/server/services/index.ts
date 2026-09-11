import UserService from "@repo/services/user";
import { StandardsService } from "@repo/services/standards";
import { QcoService } from "@repo/services/qco";
import { RecommendService } from "@repo/services/recommend";
import { defaultRecommendationReasoner } from "@repo/services/recommend/reasoner";

export const userService = new UserService();
export const standardsService = new StandardsService();
export const qcoService = new QcoService();
export const recommendService = new RecommendService({
  standards: standardsService,
  qco: qcoService,
  reasoner: defaultRecommendationReasoner(),
});
