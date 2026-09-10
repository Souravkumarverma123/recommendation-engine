/**
 * Parse and normalise Indian Standard designation strings.
 *
 * BIS's own systems render the same standard many ways:
 *   "IS 456:2000"            "IS 456 : 2000"
 *   "IS 1489 (Part 1) : 1991"   "IS 1489 : PART 1 : 1991"
 *   "IS 516 (Part-5/Sec-1) : 2018"   "IS 516 : Part 5 : Sec 1 : 2018"
 *   "10322 (Part 5/Sec 1)"   (no "IS " prefix)
 *   "IS/IEC 60947 : Part 5 : Sec 1 : 2024"   "IS/ISO 9001 : 2015"
 *   "SP 6 : Part 7"          "IS 8112"   (no year)
 *
 * Tender text is messier still. Everything must resolve to one canonical key.
 * This is the entity-resolution primitive the independent QCO check and the
 * harvester both depend on (see docs/PRD.md §Seam 2).
 *
 * Scope: a numeric run longer than 6 digits is treated as unparseable — no real
 * IS number is that long, so it is almost certainly a phone number or an id.
 */

export interface Designation {
  /** IS | SP | IS/IEC | IS/ISO | IS/ISO/IEC */
  series: string;
  /** numeric part of the designation, e.g. "456" */
  number: string;
  part: number | null;
  section: number | null;
  year: number | null;
  /** stable match key WITHOUT year: "is:456:p1:s1" */
  key: string;
  /** stable match key WITH year: "is:456:p1:s1:2018" (falls back to key when no year) */
  keyWithYear: string;
  /** pretty canonical form: "IS 456 (Part 1/Sec 1) : 2018" */
  canonical: string;
}

/**
 * Series prefix, longest form first. `\s*` around the slashes tolerates
 * "IS / IEC". Matched against the trimmed value, so `^` means "the string
 * starts with a series token".
 */
const SERIES_RE = /^(IS\s*\/\s*ISO\s*\/\s*IEC|IS\s*\/\s*ISO|IS\s*\/\s*IEC|IS|SP)(?![A-Za-z])/i;
/** "Part 5", "PART-1", "Parts 5" — captures the number. */
const PART_RE = /\bparts?[\s-]*([0-9]+)/i;
/** "Sec 1", "Section 1", "Sections 1" — captures the number. */
const SECTION_RE = /\bsec(?:tion)?s?[\s-]*([0-9]+)/i;
/** A 1-6 digit run that is not glued to another digit or a decimal point. */
const NUMBER_RE = /(?<![.\d])(\d{1,6})(?![.\d])/;
const YEAR_RE = /\b(?:19|20)\d{2}\b/;
/** Parenthetical groups — "(Part 1)", "(Amd 1)" — dropped before number hunting. */
const PAREN_GROUP_RE = /\([^()]*\)/g;
/**
 * Bare part/section markers — "Part 5", "PART-1", "Sections 1" — dropped before
 * number/year hunting. Derived from PART_RE/SECTION_RE so the vocabulary lives
 * in one place; the capture groups are inert in this context.
 */
const PART_SECTION_MARKER_RE = new RegExp(`(?:${PART_RE.source})|(?:${SECTION_RE.source})`, "gi");
/**
 * Unicode dashes folded to an ASCII hyphen: the U+2010-U+2015 block (hyphen,
 * non-breaking hyphen, figure/en/em dash, horizontal bar) plus U+2212 minus.
 */
const UNICODE_DASH_RE = /[‐-―−]/g;

/**
 * Parse a designation string into its canonical form. Returns `null` only when
 * no standard number can be found at all — a lone "Part 3", "N/A", free text,
 * an empty string, or a non-string input.
 *
 * Two strings for the same standard that differ only in formatting or year
 * produce the same `key`; add the year with `keyWithYear`.
 */
export function parseDesignation(raw: string): Designation | null {
  if (typeof raw !== "string") return null;

  // `\s` already covers NBSP and the other unicode spaces; collapse them here.
  const s = raw.replace(UNICODE_DASH_RE, "-").replace(/\s+/g, " ").trim();
  if (s === "") return null;

  const seriesMatch = s.match(SERIES_RE);
  const series = (seriesMatch?.[1] ?? "IS").replace(/\s+/g, "").toUpperCase();

  // With no recognised series, a bare number leading the string is taken as IS
  // ("10322 (Part 5/Sec 1)", "456 : 2000"). An alien alpha prefix must not be
  // coerced: "BS 123" / "EN 10025" are other bodies' standards, not is:123.
  if (!seriesMatch && /[A-Za-z]/.test(s.split(/\d/, 1)[0] ?? "")) return null;

  const part = toInt(s.match(PART_RE)?.[1]);
  // A section with no part is meaningless in the IS scheme; drop it so `key` and
  // `canonical` can't disagree about whether the section is present.
  const section = part != null ? toInt(s.match(SECTION_RE)?.[1]) : null;

  // Hunt for the standard number in the string with the series prefix and every
  // part/section grouping removed, so "10322 (Part 5/Sec 1)" surfaces 10322 and
  // a lone "Part 3" surfaces nothing.
  const afterSeries = seriesMatch ? s.slice(seriesMatch[0].length) : s;
  const numberHaystack = afterSeries
    .replace(PAREN_GROUP_RE, " ")
    .replace(PART_SECTION_MARKER_RE, " ");
  const numMatch = numberHaystack.match(NUMBER_RE);
  if (!numMatch?.[1]) return null;
  const number = String(parseInt(numMatch[1], 10));

  // Year: a 19xx/20xx token in the same haystack (parens + part/section markers
  // already gone) once the standard number is blanked out — so "IS 2062 : 2011"
  // reads year 2011, "IS 2016" reads year null, and a 4-digit part can't leak in.
  const year = toInt(numberHaystack.replace(numMatch[1], " ").match(YEAR_RE)?.[0]);

  const seriesKey = series.toLowerCase().replace(/\//g, "-");
  const key = [
    seriesKey,
    number,
    part != null ? `p${part}` : null,
    section != null ? `s${section}` : null,
  ]
    .filter(Boolean)
    .join(":");
  const keyWithYear = year != null ? `${key}:${year}` : key;

  let canonical = `${series} ${number}`;
  if (part != null)
    canonical += section != null ? ` (Part ${part}/Sec ${section})` : ` (Part ${part})`;
  if (year != null) canonical += ` : ${year}`;

  return { series, number, part, section, year, key, keyWithYear, canonical };
}

/** Convenience: match key without the year. "" when unparseable. */
export function normalizeDesignation(raw: string): string {
  return parseDesignation(raw)?.key ?? "";
}

/** Convenience: match key with the year when present. "" when unparseable. */
export function normalizeDesignationWithYear(raw: string): string {
  return parseDesignation(raw)?.keyWithYear ?? "";
}

/** True when two raw designations refer to the same standard (ignoring year). */
export function sameStandard(a: string, b: string): boolean {
  const ka = normalizeDesignation(a);
  return ka !== "" && ka === normalizeDesignation(b);
}

function toInt(v: string | undefined): number | null {
  if (v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
