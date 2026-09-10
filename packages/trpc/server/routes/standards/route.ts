import {
  standardsSearchInputSchema,
  standardsSearchOutputSchema,
} from "@repo/services/standards/model";
import { standardsService } from "../../services";
import { publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Standards"];
const getPath = generatePath("/standards");

export const standardsRouter = router({
  search: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/search"), tags: TAGS } })
    .input(standardsSearchInputSchema)
    .output(standardsSearchOutputSchema)
    .query(async ({ input }) => {
      return standardsService.search(input);
    }),
});
