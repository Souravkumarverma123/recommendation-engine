import {
  recommendRunInputSchema,
  recommendRunOutputSchema,
} from "@repo/services/recommend/model";
import { recommendService } from "../../services";
import { publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Recommend"];
const getPath = generatePath("/recommend");

export const recommendRouter = router({
  run: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/run"), tags: TAGS } })
    .input(recommendRunInputSchema)
    .output(recommendRunOutputSchema)
    .query(async ({ input }) => {
      return recommendService.run(input);
    }),
});
