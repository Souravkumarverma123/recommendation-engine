/**
 * The independent regulatory check (ticket #8).
 *
 * `checkStatus` answers one question — is conformity to this standard legally
 * mandatory? — by querying the QCO obligation data keyed on the *normalised*
 * designation, plus a separate scope test for the horizontal QCOs that no
 * IS-number lookup can capture. It never infers "mandatory" from the fact that
 * a standard exists (BIS Rules 2018, Rule 24; docs/PRD.md §Architecture).
 *
 * "No QCO found" is a verified `VOLUNTARY`, not missing information.
 */
import { db, eq } from "@repo/database";
import { qcoObligationsTable, qcosTable } from "@repo/database/schema";
import { parseDesignation } from "../bis/designation";
import { HORIZONTAL_QCOS } from "./seed/demo-qcos.data";
import {
  qcoCheckStatusInputSchema,
  type QcoCheckStatusInput,
  type QcoCheckStatusOutput,
  type QcoCitation,
  type RegulatoryStatus,
} from "./model";

interface ObligationRow {
  obStatus: string;
  enforcementDate: string | null;
  scheme: string | null;
  title: string;
  soNumbers: string[] | null;
  soDates: string[] | null;
  ministry: string | null;
  sourceUrl: string | null;
  gazettePdfUrl: string | null;
}

export class QcoService {
  /**
   * The regulatory badge for one standard, with its citation. Input is
   * re-validated here so the method is safe to call outside tRPC.
   */
  async checkStatus(input: QcoCheckStatusInput): Promise<QcoCheckStatusOutput> {
    const { isNumber, productText } = qcoCheckStatusInputSchema.parse(input);
    const key = parseDesignation(isNumber)?.key ?? null;

    if (key) {
      const rows = await db
        .select({
          obStatus: qcoObligationsTable.status,
          enforcementDate: qcoObligationsTable.enforcementDate,
          scheme: qcoObligationsTable.scheme,
          title: qcosTable.title,
          soNumbers: qcosTable.soNumbers,
          soDates: qcosTable.soDates,
          ministry: qcosTable.ministry,
          sourceUrl: qcosTable.sourceUrl,
          gazettePdfUrl: qcosTable.gazettePdfUrl,
        })
        .from(qcoObligationsTable)
        .innerJoin(qcosTable, eq(qcoObligationsTable.qcoId, qcosTable.id))
        .where(eq(qcoObligationsTable.isNumberNormalized, key));

      const chosen = pickObligation(rows as ObligationRow[]);
      if (chosen) {
        return { status: chosen.status, qco: chosen.citation, note: null };
      }
    }

    // Independent of the IS-number result: does the product description fall
    // inside a horizontal QCO's scope? Those confer mandatory status without
    // naming an IS number, so a match cannot be auto-resolved.
    if (productText) {
      const horizontal = HORIZONTAL_QCOS.find((h) => h.matches.test(productText));
      if (horizontal) {
        return {
          status: "NEEDS_REVIEW",
          qco: {
            title: horizontal.title,
            soNumbers: horizontal.soNumbers,
            soDates: [],
            enforcementDate: null,
            scheme: null,
            ministry: horizontal.ministry,
            sourceUrl: horizontal.sourceUrl,
            gazettePdfUrl: null,
          },
          note:
            `Product description matches the scope of "${horizontal.title}", ` +
            "a horizontal QCO that confers mandatory status by scope rather " +
            "than by IS number. Confirm applicability manually.",
        };
      }
    }

    return { status: "VOLUNTARY", qco: null, note: null };
  }
}

const STATUS_RANK: Record<"MANDATORY" | "UPCOMING", number> = {
  MANDATORY: 0,
  UPCOMING: 1,
};

/**
 * Reduce the obligation rows for one standard to a single verdict. An in-force
 * obligation outranks an upcoming one; ties break on the earlier enforcement
 * date. Returns `null` when there are no rows.
 */
function pickObligation(
  rows: ObligationRow[],
): { status: RegulatoryStatus; citation: QcoCitation } | null {
  if (rows.length === 0) return null;

  const ranked = rows
    .map((row) => ({ row, status: resolveStatus(row) }))
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        compareDates(a.row.enforcementDate, b.row.enforcementDate),
    );

  const best = ranked[0]!;
  return { status: best.status, citation: toCitation(best.row) };
}

function resolveStatus(row: ObligationRow): "MANDATORY" | "UPCOMING" {
  if (row.obStatus === "UPCOMING") return "UPCOMING";
  return isFutureDate(row.enforcementDate) ? "UPCOMING" : "MANDATORY";
}

function isFutureDate(iso: string | null): boolean {
  if (!iso) return false;
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(t) && t > Date.now();
}

function compareDates(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : 1;
}

function toCitation(row: ObligationRow): QcoCitation {
  return {
    title: row.title,
    soNumbers: row.soNumbers ?? [],
    soDates: row.soDates ?? [],
    enforcementDate: row.enforcementDate,
    scheme: row.scheme,
    ministry: row.ministry,
    sourceUrl: row.sourceUrl,
    gazettePdfUrl: row.gazettePdfUrl,
  };
}

export const qcoService = new QcoService();
