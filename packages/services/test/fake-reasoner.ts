/**
 * Deterministic offline stand-in for the OpenAI reasoning step, used by the
 * `recommend.run` seam test (docs/PRD.md §Testing Decisions: "OpenAI is mocked
 * with deterministic fixtures — a canned structured completion — no network, no
 * spend, no flakiness").
 *
 * It is a tiny rule engine, not a language model: it echoes the candidates in
 * the order retrieval handed them over, classifies each one's role from its
 * title/type, lifts evidence words that literally appear in both the
 * requirement and the candidate's text, runs a handful of regex gap-warning
 * rules over the requirement, and writes a draft clause whose certification
 * language follows the *authoritative* regulatory status passed in on the
 * primary candidate.
 *
 * Deliberately crude — just enough shape for the seam assertions to exercise the
 * ranking → verification → assembly path. Never shipped.
 */
import type {
  GapWarning,
  RecommendationReasoning,
  ReasonerCandidate,
  ReasonerInput,
  RecommendationReasoner,
  StandardRole,
} from "../recommend/reasoner";

/** Brand / proprietary terms a no-brand-rule check should catch (GFR Rule 144). */
const BRAND_RE =
  /\b(godrej|featherlite|nilkamal|wipro|ultratech|ambuja|acc|tata steel|jsw|jindal|sail|dell|hp|lenovo|apple|samsung|bosch)\b/i;
/** A foreign/international standard cited directly (not the Indian adoption "IS/ISO …"). */
const FOREIGN_STD_RE = /(?<!IS\s?\/\s?)\b(?:ISO|IEC|ASTM|EN|BS|DIN)\s?\d{2,}\b/i;
/** Imperial / non-SI quantities. */
const NON_METRIC_RE =
  /\b\d+(?:\.\d+)?\s?(?:inch(?:es)?|"|ft|feet|foot|lb|lbs|pounds?|psi)\b/i;

function firstMatch(re: RegExp, text: string): string | null {
  const m = re.exec(text);
  return m ? m[0].trim() : null;
}

function classifyRole(candidate: ReasonerCandidate, isTop: boolean): StandardRole {
  // The fake echoes retrieval order, so the top hit is its PRIMARY — decide
  // that before the keyword heuristics (a product spec whose title mentions
  // "Test Methods" is still the primary standard, not a test-method companion).
  if (isTop) return "PRIMARY";
  const haystack = `${candidate.title} ${candidate.typeOfStandard ?? ""}`.toLowerCase();
  if (/test method/.test(haystack)) return "TEST_METHOD";
  if (/terminology|glossary|vocabulary/.test(haystack)) return "TERMINOLOGY";
  if (/safety/.test(haystack)) return "SAFETY";
  if (/code of practice|guidelines|installation/.test(haystack)) return "NORMATIVE_REFERENCE";
  return "RELATED";
}

/**
 * Contiguous spans of the requirement that also read as a run in the
 * candidate's text — the longest such span starting at each word, so the
 * fixtures exercise real phrase evidence ("hot rolled structural steel") and
 * its verbatim verification, not just isolated word hits. Each span is sliced
 * straight from `specText`, so it is a literal substring of the officer's input.
 */
function evidenceFor(candidate: ReasonerCandidate, specText: string): string[] {
  const candidateText = `${candidate.title} ${candidate.summary ?? ""}`.toLowerCase();
  const words = [...specText.matchAll(/[A-Za-z0-9][A-Za-z0-9-]*/g)];
  const kept: string[] = [];
  let cursor = 0;

  for (let i = 0; i < words.length && kept.length < 3; i++) {
    if (i < cursor) continue;
    let best: { span: string; nextWord: number } | null = null;
    for (let j = i; j < Math.min(words.length, i + 4); j++) {
      const start = words[i]!.index;
      const end = words[j]!.index + words[j]![0].length;
      const span = specText.slice(start, end);
      if (candidateText.includes(span.toLowerCase())) best = { span, nextWord: j + 1 };
    }
    if (best && (best.span.includes(" ") || best.span.length >= 4)) {
      kept.push(best.span);
      cursor = best.nextWord;
    }
  }

  return kept;
}

function gapWarningsFor(specText: string, candidates: ReasonerCandidate[]): GapWarning[] {
  const warnings: GapWarning[] = [];

  const brand = firstMatch(BRAND_RE, specText);
  if (brand) {
    warnings.push({
      kind: "BRAND_NAME",
      message: `"${brand}" is a brand name. GFR Rule 144 bars proprietary terms in a tender specification; describe the requirement generically.`,
      evidence: brand,
    });
  }

  const foreign = firstMatch(FOREIGN_STD_RE, specText);
  if (foreign) {
    warnings.push({
      kind: "FOREIGN_STANDARD",
      message: `"${foreign}" is a foreign/international standard. Cite the equivalent Indian Standard where one exists.`,
      evidence: foreign,
    });
  }

  const nonMetric = firstMatch(NON_METRIC_RE, specText);
  if (nonMetric) {
    warnings.push({
      kind: "NON_METRIC_UNIT",
      message: `"${nonMetric}" is a non-metric unit. Indian tenders must specify quantities in SI/metric units.`,
      evidence: nonMetric,
    });
  }

  for (const candidate of candidates) {
    if (candidate.lifecycleStatus !== "WITHDRAWN") continue;
    const bare = candidate.number.replace(/\s*:.*/, "");
    const escaped = bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const cited = firstMatch(new RegExp(`\\b${escaped}\\b`, "i"), specText);
    if (cited) {
      warnings.push({
        kind: "SUPERSEDED_CITATION",
        message: `The draft cites ${cited}, which BIS shows as withdrawn/superseded. Cite the current edition instead.`,
        evidence: cited,
      });
    }
  }

  return warnings;
}

function conciseAnswerFor(primary: ReasonerCandidate | undefined, specText: string): string {
  if (!primary) {
    return `For "${specText.slice(0, 80)}", no directly applicable Indian Standard was identified among the retrieved candidates. Refine the product description and try again.`;
  }
  const cert =
    primary.regulatoryStatus === "MANDATORY" || primary.regulatoryStatus === "UPCOMING"
      ? "BIS certification is mandatory — require the Standard Mark under licence."
      : primary.regulatoryStatus === "VOLUNTARY"
        ? "No QCO applies — require conformity without the Standard Mark."
        : "Certification applicability needs confirmation before finalising the clause.";
  return `For your requirement, ${primary.number} (${primary.title}) is the applicable standard. ${cert}`;
}

function draftClauseFor(primary: ReasonerCandidate | undefined, specText: string): string {
  if (!primary) {
    return `The goods supplied shall conform to the applicable Indian Standards for: ${specText}.`;
  }
  const ref = `${primary.number} (${primary.title})`;
  if (primary.regulatoryStatus === "MANDATORY" || primary.regulatoryStatus === "UPCOMING") {
    return `The goods supplied shall conform in all respects to ${ref} in its latest revision, and the supplier shall hold a valid Bureau of Indian Standards product-certification licence for the goods and mark them accordingly.`;
  }
  if (primary.regulatoryStatus === "NEEDS_REVIEW") {
    return `The goods supplied shall conform in all respects to ${ref} in its latest revision. Confirm whether a Quality Control Order makes certification compulsory for these goods before finalising the certification clause.`;
  }
  return `The goods supplied shall conform in all respects to ${ref} in its latest revision.`;
}

export class FakeRecommendationReasoner implements RecommendationReasoner {
  reason(input: ReasonerInput): Promise<RecommendationReasoning> {
    const { specText, candidates } = input;

    const rankedStandards = candidates.map((candidate, i) => ({
      number: candidate.number,
      role: classifyRole(candidate, i === 0),
      reason: `Applies to the stated requirement — ${candidate.title}.`,
      evidence: evidenceFor(candidate, specText),
    }));

    // Draft the clause from whichever standard was classified PRIMARY, not a
    // fixed list position — so the fixture stays honest if the ranking changes.
    const primaryNumber = rankedStandards.find((s) => s.role === "PRIMARY")?.number;
    const primary = candidates.find((c) => c.number === primaryNumber);

    return Promise.resolve({
      requirementSummary: `Procurement requirement: ${specText.slice(0, 160)}`,
      rankedStandards,
      gapWarnings: gapWarningsFor(specText, candidates),
      draftClause: draftClauseFor(primary, specText),
      conciseAnswer: conciseAnswerFor(primary, specText),
    });
  }
}

export const fakeRecommendationReasoner = new FakeRecommendationReasoner();

/**
 * A reasoner that emits exactly what it is told to — for the seam tests that
 * check post-hoc verification (a hallucinated designation is dropped) and that
 * assembly follows the model's ranking even when its PRIMARY is not the
 * top retrieval hit.
 */
export class ScriptedRecommendationReasoner implements RecommendationReasoner {
  constructor(private readonly script: RecommendationReasoning) {}

  reason(): Promise<RecommendationReasoning> {
    return Promise.resolve(this.script);
  }
}
