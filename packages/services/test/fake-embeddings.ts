/**
 * Deterministic offline stand-in for the OpenAI embedder, used by the
 * hybrid-search and `recommend.run` seam tests (docs/PRD.md §Testing Decisions:
 * "OpenAI is mocked with deterministic fixtures — no network, no spend, no
 * flakiness").
 *
 * It is a tiny concept model, not a hash: text is lower-cased, scanned for a
 * fixed vocabulary of domain concepts (with a few synonyms and bigrams), and
 * turned into an L2-normalised one-hot-ish vector over those concepts, zero-
 * padded to `EMBEDDING_DIM`. Two texts that talk about the same thing in
 * different words land near each other; text with no known concept (a nonsense
 * query, stop words) embeds to the zero vector, which the search layer reads as
 * "no semantic signal" and skips.
 *
 * This is deliberately crude — just enough shared meaning for the seam
 * assertions to exercise the pgvector + RRF path. It is never shipped.
 */
import { EMBEDDING_DIM, type EmbeddingProvider } from "../llm/embeddings";

/** Ordered concept vocabulary — each concept owns one vector dimension. */
const CONCEPTS = [
  "concrete",
  "cement",
  "portland",
  "pozzolana",
  "fly_ash",
  "reinforcement",
  "mix_design",
  "grade",
  "structural",
  "load_bearing",
  "frame",
  "building",
  "construction",
  "steel",
  "hot_rolled",
  "section_profile",
  "tensile",
  "helmet",
  "head_protection",
  "two_wheeler",
  "industrial_safety",
  "ppe",
  "furniture",
  "chair",
  "desk",
  "office",
  "ergonomic",
  "electronics",
  "it_equipment",
  "av_equipment",
  "electrical_safety",
  "power_supply",
  "code_of_practice",
  "specification",
  "test_method",
] as const;

const CONCEPT_INDEX = new Map<string, number>(CONCEPTS.map((c, i) => [c, i]));

/**
 * Phrase (single word or space-joined bigram) → concepts it evidences. Matched
 * against the lower-cased token stream, so word order and punctuation in the
 * source text do not matter.
 */
const LEXICON: Record<string, readonly string[]> = {
  concrete: ["concrete"],
  "reinforced concrete": ["concrete", "reinforcement", "structural"],
  rcc: ["concrete", "reinforcement", "structural"],
  cement: ["cement"],
  portland: ["portland", "cement"],
  "portland cement": ["portland", "cement"],
  opc: ["portland", "cement", "grade"],
  pozzolana: ["pozzolana", "cement"],
  ppc: ["pozzolana", "cement"],
  "fly ash": ["fly_ash", "pozzolana"],
  reinforcement: ["reinforcement"],
  reinforcing: ["reinforcement"],
  rebar: ["reinforcement", "steel"],
  reinforcing_bar: ["reinforcement", "steel"],
  deformed: ["reinforcement", "steel"],
  tmt: ["reinforcement", "steel"],
  mix: ["mix_design"],
  "mix design": ["mix_design", "concrete"],
  proportioning: ["mix_design", "concrete"],
  grade: ["grade"],
  structural: ["structural"],
  structure: ["structural"],
  "load bearing": ["load_bearing", "structural"],
  "load-bearing": ["load_bearing", "structural"],
  loadbearing: ["load_bearing", "structural"],
  bearing: ["load_bearing"],
  frame: ["frame", "structural"],
  framing: ["frame", "structural"],
  framework: ["frame", "structural"],
  building: ["building", "construction"],
  construction: ["construction"],
  steel: ["steel"],
  "hot rolled": ["hot_rolled", "steel"],
  "hot-rolled": ["hot_rolled", "steel"],
  beam: ["section_profile", "steel", "structural"],
  column: ["section_profile", "steel", "structural"],
  channel: ["section_profile", "steel"],
  angle: ["section_profile", "steel"],
  section: ["section_profile"],
  girder: ["section_profile", "steel", "structural"],
  tensile: ["tensile", "steel"],
  helmet: ["helmet", "head_protection", "ppe"],
  headgear: ["helmet", "head_protection", "ppe"],
  "hard hat": ["helmet", "head_protection", "industrial_safety", "ppe"],
  "two wheeler": ["two_wheeler"],
  "two-wheeler": ["two_wheeler"],
  motorcycle: ["two_wheeler"],
  motorbike: ["two_wheeler"],
  scooter: ["two_wheeler"],
  rider: ["two_wheeler"],
  riding: ["two_wheeler"],
  pillion: ["two_wheeler"],
  industrial: ["industrial_safety"],
  "safety helmet": ["helmet", "industrial_safety", "ppe"],
  ppe: ["ppe"],
  "protective equipment": ["ppe"],
  "protective gear": ["ppe"],
  furniture: ["furniture"],
  seating: ["chair", "furniture"],
  seat: ["chair", "furniture"],
  chair: ["chair", "furniture"],
  stool: ["chair", "furniture"],
  desk: ["desk", "furniture", "office"],
  table: ["desk", "furniture"],
  workstation: ["desk", "furniture", "office"],
  office: ["office"],
  workplace: ["office"],
  institutional: ["office"],
  ergonomic: ["ergonomic", "chair"],
  ergonomics: ["ergonomic", "chair"],
  electronics: ["electronics"],
  electronic: ["electronics"],
  laptop: ["it_equipment", "electronics", "power_supply"],
  notebook: ["it_equipment", "electronics"],
  computer: ["it_equipment", "electronics"],
  monitor: ["it_equipment", "electronics"],
  "information technology": ["it_equipment", "electronics"],
  "it hardware": ["it_equipment", "electronics"],
  server: ["it_equipment", "electronics"],
  networking: ["it_equipment", "electronics"],
  audio: ["av_equipment", "electronics"],
  video: ["av_equipment", "electronics"],
  television: ["av_equipment", "electronics"],
  "set top box": ["av_equipment", "electronics"],
  adapter: ["power_supply", "electrical_safety"],
  adaptor: ["power_supply", "electrical_safety"],
  charger: ["power_supply", "electrical_safety"],
  "power supply": ["power_supply", "electrical_safety"],
  psu: ["power_supply", "electrical_safety"],
  "electrical safety": ["electrical_safety"],
  "electric shock": ["electrical_safety"],
  "shock hazard": ["electrical_safety"],
  safety: ["electrical_safety", "industrial_safety"],
  "code of practice": ["code_of_practice"],
  code: ["code_of_practice"],
  "design code": ["code_of_practice", "structural"],
  specification: ["specification"],
  "test method": ["test_method"],
  testing: ["test_method"],
};

/** Longest phrase in the lexicon, in tokens — how wide the n-gram window is. */
const MAX_PHRASE_LEN = Math.max(...Object.keys(LEXICON).map((k) => k.split(" ").length));

function conceptWeights(text: string): Map<number, number> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const weights = new Map<number, number>();
  for (let i = 0; i < tokens.length; i++) {
    for (let len = Math.min(MAX_PHRASE_LEN, tokens.length - i); len >= 1; len--) {
      const phrase = tokens.slice(i, i + len).join(" ");
      const concepts = LEXICON[phrase];
      if (!concepts) continue;
      for (const concept of concepts) {
        const dim = CONCEPT_INDEX.get(concept);
        if (dim == null) continue;
        weights.set(dim, (weights.get(dim) ?? 0) + 1);
      }
      // Longest phrase starting at i wins; skip the tokens it consumed so an
      // inner word ("concrete" inside "reinforced concrete") isn't recounted.
      i += len - 1;
      break;
    }
  }
  return weights;
}

/**
 * Concept model described in the file header. Exposed as a class so a test can
 * assert on `conceptsFor` when it needs to explain a ranking.
 */
export class FakeEmbeddingProvider implements EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(texts.map((text) => this.embedOne(text)));
  }

  /** The concept dimensions a string activates — for test diagnostics. */
  conceptsFor(text: string): string[] {
    return [...conceptWeights(text).keys()].map((dim) => CONCEPTS[dim]!).sort();
  }

  private embedOne(text: string): number[] {
    const weights = conceptWeights(text);
    const vector = new Array<number>(EMBEDDING_DIM).fill(0);
    if (weights.size === 0) return vector; // no known concept -> zero vector

    let norm = 0;
    for (const w of weights.values()) norm += w * w;
    norm = Math.sqrt(norm);

    for (const [dim, w] of weights) vector[dim] = w / norm;
    return vector;
  }
}

export const fakeEmbeddingProvider = new FakeEmbeddingProvider();
