/**
 * Shape one `getWebsiteStandardDetails` payload into the subset of `standards`
 * columns the detail harvest owns (ticket #11, docs/PRD.md data strategy (b)).
 *
 * Pure — no DB, no network — so it is unit tested the same way `mapListItem` is.
 * Only the fields the title-level list harvest cannot supply are returned; the
 * designation, title, series, edition year, embedding and team summary are left
 * for their own owners. `groupName` is left alone too — the list harvest and the
 * demo seed both use it for the committee alias, and the detail payload's
 * `groupName` is a different taxonomy (stored on the sub-group columns instead).
 */
import type { InsertStandard } from "@repo/database/schema";
import type { BisDetail } from "@repo/services/bis/model";

import { toDateString } from "./map-list-item";

/** Parse a small integer that BIS sends as a zero-padded string ("04", "06"). */
function toInt(value: string | null | undefined): number | null {
  if (value == null) return null;
  const n = Number.parseInt(value.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function trimToNull(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export type StandardDetailFields = Pick<
  InsertStandard,
  | "shortTitle"
  | "pkIsId"
  | "committeeId"
  | "departmentId"
  | "subGroupName"
  | "subSubGroupName"
  | "icsCode"
  | "equivalenceType"
  | "equivalentIsNumber"
  | "isStatus"
  | "withdrawStatus"
  | "withdrawnOn"
  | "supersededByRaw"
  | "revisionCount"
  | "amendmentCount"
  | "reaffirmationOn"
  | "pdfKey"
  | "raw"
>;

export function mapDetail(detail: BisDetail): StandardDetailFields {
  return {
    shortTitle: trimToNull(detail.shortTitle),
    pkIsId: detail.pk_is_id ?? null,
    committeeId: detail.committeeId ?? null,
    departmentId: detail.departmentId ?? null,
    subGroupName: trimToNull(detail.subGroupName),
    subSubGroupName: trimToNull(detail.subSubGroupName),
    icsCode: trimToNull(detail.icsCode),
    equivalenceType: trimToNull(detail.equivalenceTypeName),
    equivalentIsNumber: trimToNull(detail.equivalentIs) ?? trimToNull(detail.identical_is),
    isStatus: detail.isStatus ?? null,
    withdrawStatus: detail.withdrawStatus ?? null,
    withdrawnOn: toDateString(detail.withdrawOn),
    supersededByRaw: trimToNull(detail.superseded_byis),
    revisionCount: toInt(detail.noOfRevision),
    amendmentCount: toInt(detail.noOfAmendment),
    reaffirmationOn: toDateString(detail.reAffirmationYear),
    pdfKey: trimToNull(detail.is_documents),
    raw: detail,
  };
}
