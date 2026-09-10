import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { standardsRouter } from "./routes/standards/route";
import { qcoRouter } from "./routes/qco/route";
import { recommendRouter } from "./routes/recommend/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  standards: standardsRouter,
  qco: qcoRouter,
  recommend: recommendRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
