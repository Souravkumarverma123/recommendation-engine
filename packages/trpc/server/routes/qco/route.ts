import {
  qcoCheckStatusInputSchema,
  qcoCheckStatusOutputSchema,
} from "@repo/services/qco/model";
import { qcoService } from "../../services";
import { publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["QCO"];
const getPath = generatePath("/qco");

export const qcoRouter = router({
  checkStatus: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/check-status"), tags: TAGS } })
    .input(qcoCheckStatusInputSchema)
    .output(qcoCheckStatusOutputSchema)
    .query(async ({ input }) => {
      return qcoService.checkStatus(input);
    }),
});
