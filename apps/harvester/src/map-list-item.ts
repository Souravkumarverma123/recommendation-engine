/**
 * Shape one BIS catalogue row (`getWebsiteIndianStandardsList`) into a
 * `standards` insert. Pure — no DB, no network — so it is exhaustively unit
 * tested (map-list-item.test.ts) the same way `parseDesignation` is.
 *
 * The list endpoint is title-level only: it carries the designation, title,
 * committee name, standard type and publish date, but not lifecycle status,
 * ISO/IEC equivalence or the numeric committee/department ids. Those are topped
 * up later — for the demo slice by the reviewed seed loader, catalogue-wide by
 * the detail harvest (a follow-up ticket).
 */
import type { InsertStandard } from "@repo/database/schema";
import { parseDesignation } from "@repo/services/bis/designation";
import type { BisListItem } from "@repo/services/bis/model";

/**
 * One catalogue row → a `standards` insert, or `null` when the designation
 * cannot be parsed at all. The caller counts the skips rather than writing a row
 * with an empty normalised key that nothing could ever match.
 */
export function mapListItem(item: BisListItem): InsertStandard | null {
  const number = item.standardNumber.trim();
  const parsed = parseDesignation(number);
  if (!parsed) return null;

  const title = (item.standardName ?? item.standardLabel ?? number).trim();

  return {
    bisStandardId: item.standardId,
    bisEncId: item.standardEncId,
    number,
    // Match key WITHOUT the year — the whole codebase keys on `parsed.key`
    // (the demo seed loader, the QCO obligation matcher). `edition_year` keeps
    // the year separately.
    numberNormalized: parsed.key,
    series: parsed.series,
    editionYear: parsed.year,
    title,
    typeOfStandard: item.typeOfStandardName?.trim() ?? null,
    // Committee name string until the taxonomy harvest fills committee_id —
    // same slot the reviewed demo seed uses.
    groupName: item.sectionalCommitteeName?.trim() ?? null,
    publishedOn: toDateString(item.publishedOn),
    raw: item,
  };
}

/** Accept only a leading ISO `YYYY-MM-DD`; anything else becomes null. */
function toDateString(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match ? match[1]! : null;
}
