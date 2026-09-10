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

const SERIES_RE = /^(IS\/ISO\/IEC|IS\/ISO|IS\/IEC|IS|SP)\b/i;
const PART_RE = /part[\s-]*([0-9]+)/i;
const SECTION_RE = /(?:sec|section)[\s-]*([0-9]+)/i;
const NUMBER_RE = /(?:^|\s)(\d{1,6})(?:[\s:/(]|$)/;
const YEAR_RE = /\b(19|20)\d{2}\b/;

/**
 * Parse a designation string. Returns null only when no numeric standard number
 * can be found at all.
 */
export function parseDesignation(raw: string): Designation | null {
  const s = ` ${raw.replace(/\u00a0/g, " ").trim()} `;

  const seriesMatch = s.match(SERIES_RE);
  const series = (seriesMatch?.[1] ?? "IS").toUpperCase();

  // strip the series prefix before hunting for the number
  const afterSeries = seriesMatch ? s.slice(s.indexOf(seriesMatch[0]) + seriesMatch[0].length) : s;

  const numMatch = afterSeries.match(NUMBER_RE) ?? s.match(NUMBER_RE);
  if (!numMatch?.[1]) return null;
  const number = String(parseInt(numMatch[1], 10));

  const part = toInt(s.match(PART_RE)?.[1]);
  const section = toInt(s.match(SECTION_RE)?.[1]);
  const year = toInt(s.match(YEAR_RE)?.[0]);

  const seriesKey = series.toLowerCase().replace(/\//g, "-");
  const key = [seriesKey, number, part != null ? `p${part}` : null, section != null ? `s${section}` : null]
    .filter(Boolean)
    .join(":");
  const keyWithYear = year != null ? `${key}:${year}` : key;

  let canonical = `${series} ${number}`;
  if (part != null) canonical += section != null ? ` (Part ${part}/Sec ${section})` : ` (Part ${part})`;
  if (year != null) canonical += ` : ${year}`;

  return { series, number, part, section, year, key, keyWithYear, canonical };
}

/** Convenience: match key without the year. "" when unparseable. */
export function normalizeDesignation(raw: string): string {
  return parseDesignation(raw)?.key ?? "";
}

/** Convenience: match key with the year when present. */
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
