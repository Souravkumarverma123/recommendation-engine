/**
 * Deterministic offline stand-in for the OpenAI query translator, used by the
 * `recommend.run` seam test's Hindi scenario (ticket #13, docs/PRD.md
 * §Testing Decisions: "OpenAI is mocked with deterministic fixtures — no
 * network, no spend, no flakiness").
 *
 * Crude by design, mirroring fake-embeddings.ts: a small Hindi → English word
 * list covering the demo domains' vocabulary (just enough for the office-chair
 * fixture to retrieve the same way its English phrasing does), applied token
 * by token. A word it does not recognise passes through unchanged — including
 * Latin-script tokens (numerals, "IS 17631:2022") that need no translation at
 * all — rather than being guessed at or dropped.
 *
 * Never shipped.
 */
import type { QueryTranslator } from "../llm/translation";

/** Hindi word → the English concept word `fake-embeddings.ts`'s lexicon knows. */
const HINDI_TO_ENGLISH: Record<string, string> = {
  कार्यालय: "office",
  कार्यालयों: "office",
  कार्यालयीय: "office",
  संस्थागत: "institutional",
  कुर्सी: "chair",
  कुर्सियाँ: "chair",
  कुर्सियां: "chair",
  स्टूल: "stool",
  फर्नीचर: "furniture",
  एर्गोनॉमिक: "ergonomic",
  एर्गोनोमिक: "ergonomic",
  के: "",
  लिए: "",
  हेतु: "",
  चाहिए: "",
  आवश्यकता: "requirement",
  आपूर्ति: "supply",
};

/** Strip Hindi sentence punctuation (।) alongside the usual ASCII marks. */
function bareToken(token: string): string {
  return token.replace(/[।,.;:!?]/g, "");
}

export class FakeQueryTranslator implements QueryTranslator {
  translateToEnglish(text: string): Promise<string> {
    const translated = text
      .split(/\s+/)
      .map((token) => {
        const bare = bareToken(token);
        return HINDI_TO_ENGLISH[bare] ?? token;
      })
      .filter((token) => token.length > 0)
      .join(" ");

    return Promise.resolve(translated);
  }
}

export const fakeQueryTranslator = new FakeQueryTranslator();
