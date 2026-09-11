/**
 * Query translation for Hindi retrieval normalisation (ticket #13, docs/PRD.md
 * §Pipeline step 1 — "Normalise / detect language").
 *
 * `standards.search`'s lexical half runs Postgres FTS with the `english`
 * configuration, and the concept embedder used in tests only recognises
 * English/Latin tokens — a Hindi requirement would retrieve nothing through
 * either path. This module produces an English copy of the query for
 * *retrieval only*; the officer's original text still travels unchanged to
 * the reasoning step and to verification, so evidence excerpts stay verbatim
 * quotes of what was actually typed (docs/PRD.md user story 5) and standard
 * designations are never rewritten (they are ASCII already and pass through
 * translation untouched).
 *
 * The rest of the pipeline depends only on the {@link QueryTranslator}
 * interface. Production wires {@link OpenAIQueryTranslator} (`gpt-5-mini`,
 * the only chat model frozen day 1 — docs/PRD.md §Database); the
 * `recommend.run` seam test injects a deterministic fake
 * (packages/services/test/fake-translator.ts) so there is no network, no
 * spend and no flakiness (docs/PRD.md §Testing Decisions).
 */
import { env } from "../env";

/** Same chat model as the reasoning step (`recommend/reasoner.ts`). */
export const TRANSLATION_MODEL = "gpt-5-mini";

/**
 * How long to wait for the translation call before abandoning it. A hung
 * connection must not hold `recommend.run` open — on timeout the request
 * aborts and the caller searches with the original text instead.
 */
export const TRANSLATION_TIMEOUT_MS = 8_000;

export interface QueryTranslator {
  /** Translate `text` (Hindi) to English, for retrieval only. */
  translateToEnglish(text: string): Promise<string>;
}

const SYSTEM_PROMPT = [
  "Translate the Hindi procurement requirement into English so it can be used as a search query.",
  'Keep every BIS/IS standard designation (e.g. "IS 456:2000", "IS/ISO 9001") and every numeral exactly as written.',
  "Output only the English translation, nothing else — no preamble, no quotes.",
].join("\n");

interface OpenAIChatResponse {
  choices?: { message?: { content?: string | null } }[];
}

/**
 * Calls the OpenAI Chat Completions endpoint directly — the same `fetch`
 * style as {@link OpenAIEmbeddingProvider} and
 * {@link OpenAIRecommendationReasoner}, no SDK dependency. Not exercised in
 * CI (the seam test injects the fake); kept small and defensive.
 */
export class OpenAIQueryTranslator implements QueryTranslator {
  private readonly endpoint = "https://api.openai.com/v1/chat/completions";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = TRANSLATION_MODEL,
  ) {}

  async translateToEnglish(text: string): Promise<string> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
      signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI translation request failed (${res.status}): ${detail}`);
    }

    const body = (await res.json()) as OpenAIChatResponse;
    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("OpenAI translation response had no content");
    return content;
  }
}

/**
 * The configured translator, or `null` when `OPENAI_API_KEY` is unset — the
 * pipeline then searches with the original (untranslated) text rather than
 * failing (mirrors {@link defaultEmbeddingProvider} and
 * {@link defaultRecommendationReasoner}: a bare deployment still answers).
 *
 * Returns `null` under Vitest unconditionally: the seam test injects the
 * deterministic fake, and a forgotten injection must degrade, never reach the
 * network and real spend. `VITEST` is a runner marker, not app config, so it
 * is read straight from `process.env` rather than through the `env` module.
 */
export function defaultQueryTranslator(): QueryTranslator | null {
  if (process.env.VITEST) return null;
  return env.OPENAI_API_KEY ? new OpenAIQueryTranslator(env.OPENAI_API_KEY) : null;
}
