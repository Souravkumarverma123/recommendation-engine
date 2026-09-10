import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { standardsRouter } from "./routes/standards/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  standards: standardsRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
