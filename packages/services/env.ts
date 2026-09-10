import { z } from "zod";

const envSchema = z.object({
  // LLM + embeddings — OpenAI only (gpt-5-mini + text-embedding-3-small).
  // Frozen day-1 contract (docs/PRD.md §Database).
  OPENAI_API_KEY: z.string().optional(),

  // BIS source API (public, no auth)
  BIS_API_BASE: z.string().default("https://standardsadmin.bis.gov.in"),

  // Auth (optional — Google OAuth)
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional(),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
