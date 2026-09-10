/**
 * Text embeddings for semantic retrieval (docs/PRD.md §Pipeline step 2–3).
 *
 * The rest of the code depends only on the {@link EmbeddingProvider} interface —
 * one method, `embed(texts) => vectors`. Production wires the OpenAI
 * `text-embedding-3-small` implementation; the `recommend.run` / hybrid-search
 * seam tests inject a deterministic fake (packages/services/test/fake-embeddings.ts)
 * so there is no network, no spend and no flakiness (docs/PRD.md §Testing Decisions).
 */
import { z } from "zod";

import { EMBEDDING_DIM } from "@repo/database/schema";
import { env } from "../env";

/** OpenAI model frozen day 1 — must stay in lock-step with `EMBEDDING_DIM`. */
export const EMBEDDING_MODEL = "text-embedding-3-small";
export { EMBEDDING_DIM };

export interface EmbeddingProvider {
  /**
   * Embed each input string. Returns one vector per input, in the same order,
   * every vector `EMBEDDING_DIM` long.
   */
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * Only the fields we use, validated — the endpoint is external and its shape is
 * not ours to trust. `embedding` is pinned to `EMBEDDING_DIM` so a truncated or
 * wrong-model vector fails here, not later against `vector(1536)` in Postgres.
 */
const openAIEmbeddingResponseSchema = z.object({
  data: z
    .array(
      z.object({
        index: z.number().int(),
        embedding: z.array(z.number()).length(EMBEDDING_DIM),
      }),
    )
    .min(1),
});

/** Calls the OpenAI REST embeddings endpoint directly — no SDK dependency. */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly endpoint = "https://api.openai.com/v1/embeddings";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = EMBEDDING_MODEL,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI embeddings request failed (${res.status}): ${detail}`);
    }

    const body = openAIEmbeddingResponseSchema.parse(await res.json());
    if (body.data.length !== texts.length) {
      throw new Error(
        `OpenAI embeddings returned ${body.data.length} vectors for ${texts.length} inputs`,
      );
    }

    return body.data
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((row) => row.embedding);
  }
}

/**
 * The configured provider, or `null` when `OPENAI_API_KEY` is unset — callers
 * fall back to lexical-only search rather than failing (the demo box always has
 * the key; a bare `pnpm db:seed` without it still loads a searchable catalogue).
 *
 * Returns `null` under Vitest unconditionally: seam tests must inject the
 * deterministic fake embedder, and a forgotten injection should degrade to
 * lexical-only, never reach for the network and real spend.
 */
export function defaultEmbeddingProvider(): EmbeddingProvider | null {
  if (process.env.VITEST) return null;
  return env.OPENAI_API_KEY ? new OpenAIEmbeddingProvider(env.OPENAI_API_KEY) : null;
}
