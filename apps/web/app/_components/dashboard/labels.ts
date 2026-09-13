import type { AlliedStandard, GapWarning, Recommendation } from "./types";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const LIFECYCLE: Record<
  Recommendation["lifecycleStatus"],
  { label: string; variant: BadgeVariant }
> = {
  ACTIVE: { label: "Active", variant: "secondary" },
  WITHDRAWN: { label: "Withdrawn", variant: "destructive" },
  UNKNOWN: { label: "Status unknown", variant: "outline" },
};

export const REGULATORY: Record<
  Recommendation["regulatoryStatus"],
  { label: string; variant: BadgeVariant }
> = {
  MANDATORY: { label: "Mandatory · QCO", variant: "destructive" },
  UPCOMING: { label: "Upcoming QCO", variant: "default" },
  VOLUNTARY: { label: "Voluntary", variant: "secondary" },
  NEEDS_REVIEW: { label: "Needs review", variant: "outline" },
};

export const ROLE: Record<NonNullable<Recommendation["role"]>, string> = {
  PRIMARY: "Primary standard",
  NORMATIVE_REFERENCE: "Normative reference",
  TEST_METHOD: "Test method",
  SAFETY: "Safety",
  TERMINOLOGY: "Terminology",
  INSTALLATION: "Installation",
  RELATED: "Related",
};

export const ALLIED_ROLE: Record<AlliedStandard["role"], string> = {
  NORMATIVE_REFERENCE: "Normative reference",
  TEST_METHOD: "Test method",
  SAFETY: "Safety",
  TERMINOLOGY: "Terminology",
  INSTALLATION: "Installation",
};

export const GAP_WARNING: Record<GapWarning["kind"], string> = {
  BRAND_NAME: "Brand name",
  FOREIGN_STANDARD: "Foreign standard",
  NON_METRIC_UNIT: "Non-metric unit",
  SUPERSEDED_CITATION: "Superseded citation",
  MISSING_PARAMETER: "Missing parameter",
  OTHER: "Review",
};

/**
 * A superseded citation will fail an audit outright; the rest just weaken a
 * tender (a brand name that restricts competition, a unit mismatch). Drives
 * the severity dot in the left rail's "Check your draft" list.
 */
export const GAP_SEVERITY: Record<GapWarning["kind"], "high" | "medium"> = {
  SUPERSEDED_CITATION: "high",
  BRAND_NAME: "medium",
  FOREIGN_STANDARD: "medium",
  NON_METRIC_UNIT: "medium",
  MISSING_PARAMETER: "medium",
  OTHER: "medium",
};

export const SUGGESTIONS = [
  "500 ergonomic office chairs",
  "Structural steel for a bridge",
  "PPE helmets for construction",
];

export const MAX_SPEC_CHARS = 8000;

export function formatDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
