/**
 * Hand-seeded QCO obligations for the demo domains (ticket #8, docs/PRD.md
 * §Data strategy (c)).
 *
 * REVIEWED DATA FILE. Every S.O. number, date and covered-IS list is transcribed
 * by hand from the gazette notifications and the research doc
 * (docs/research/sih26108-bis-ecosystem-data-archaeology.md §7). Government of
 * India Gazette matter is not copyright-restricted (Copyright Act s.52(1)(q)),
 * unlike Indian Standard text.
 *
 * This is the MVP stand-in for the full Scheme I/II/IV/X + upcoming-QCO scraper
 * (a P0 follow-up). It intentionally covers only the standards in
 * `demo-standards.data.ts`. The independent-check contract (docs/PRD.md §36) is
 * the point: a standard with no row here is a *verified* `VOLUNTARY`, not an
 * unknown.
 */

/** Certification scheme the obligation runs through (`qcos` schema). */
export type QcoScheme = "I" | "II" | "IV" | "X";

/**
 * How the gazette records this obligation. `UPCOMING` is for a QCO notified
 * with no firm date yet; `MANDATORY` is everything else. This is the *source*
 * status — `QcoService` still downgrades a `MANDATORY` row to the `UPCOMING`
 * badge while its `enforcementDate` is in the future (that is the point of the
 * badge — see `resolveStatus`). Not the same enum as the output
 * `RegulatoryStatus`.
 */
export type ObligationStatus = "MANDATORY" | "UPCOMING";

export interface DemoObligation {
  /** IS number exactly as printed in the QCO schedule. */
  isNumberRaw: string;
  productLabel: string;
  scheme: QcoScheme;
  status: ObligationStatus;
  /**
   * Date the obligation begins to bite. For phased QCOs this is the *last*
   * phase (when it applies to everyone) — the research doc's MSME date for
   * Furniture. ISO `YYYY-MM-DD`.
   */
  enforcementDate?: string;
  /** Rating/category condition (Scheme X) or phase note. */
  specificRequirement?: string;
}

export interface DemoQco {
  /** Full order title as gazetted. */
  title: string;
  /**
   * S.O. numbers oldest → newest. The **last** is the order currently in force;
   * the earlier ones are its superseded amendments (the Steel QCO has five).
   * A tender cites the operative one, so the UI shows only the last — the full
   * chain belongs in a history view, not the badge line.
   */
  soNumbers: string[];
  soDates: string[]; // ISO, aligned to soNumbers
  ministry: string;
  gazettePdfUrl?: string;
  sourceUrl: string;
  obligations: DemoObligation[];
}

export const DEMO_QCOS: DemoQco[] = [
  // ---- cement / concrete --------------------------------------------------
  {
    title: "Cement (Quality Control) Order, 2003",
    soNumbers: ["S.O. 191(E)"],
    soDates: ["2003-02-17"],
    ministry: "Department for Promotion of Industry and Internal Trade",
    gazettePdfUrl: "https://www.bis.gov.in/MandatoryProducts/QCOrder/SO-No-191(E).pdf",
    sourceUrl:
      "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en",
    obligations: [
      {
        isNumberRaw: "IS 269 : 2015",
        productLabel: "Ordinary Portland Cement (33/43/53 grade)",
        scheme: "I",
        status: "MANDATORY",
      },
      {
        isNumberRaw: "IS 1489 (Part 1) : 1991",
        productLabel: "Portland Pozzolana Cement — fly ash based",
        scheme: "I",
        status: "MANDATORY",
      },
    ],
  },

  // ---- structural steel -------------------------------------------------
  {
    title: "Steel and Steel Products (Quality Control) Order, 2020",
    soNumbers: [
      "S.O. 756(E)",
      "S.O. 1673(E)",
      "S.O. 2379(E)",
      "S.O. 4082(E)",
      "S.O. 4637(E)",
    ],
    soDates: [
      "2020-02-14",
      "2020-05-27",
      "2020-07-17",
      "2020-11-12",
      "2020-12-22",
    ],
    ministry: "Ministry of Steel",
    gazettePdfUrl: "https://bis.gov.in/wp-content/uploads/2020/03/Steel-QCO-14022020-1.pdf",
    sourceUrl:
      "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en",
    obligations: [
      {
        isNumberRaw: "IS 2062 : 2011",
        productLabel: "Hot Rolled Medium and High Tensile Structural Steel",
        scheme: "I",
        status: "MANDATORY",
      },
      {
        isNumberRaw: "IS 1786 : 2008",
        productLabel: "High Strength Deformed Steel Bars and Wires for Concrete Reinforcement",
        scheme: "I",
        status: "MANDATORY",
      },
    ],
  },

  // ---- PPE / helmets --------------------------------------------------
  {
    title: "Helmet for riders of Two Wheeler Motor Vehicles (Quality Control) Order, 2020",
    soNumbers: ["S.O. 4252(E)"],
    soDates: ["2020-11-26"],
    ministry: "Department for Promotion of Industry and Internal Trade",
    sourceUrl:
      "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en",
    obligations: [
      {
        isNumberRaw: "IS 4151 : 2015",
        productLabel: "Protective Helmets for Two Wheeler Riders",
        scheme: "I",
        status: "MANDATORY",
      },
    ],
  },

  // ---- furniture ----------------------------------------------------
  {
    title: "Furniture (Quality Control) Order, 2025",
    soNumbers: ["S.O. 801(E)"],
    soDates: ["2025-02-14"],
    ministry: "Department for Promotion of Industry and Internal Trade",
    sourceUrl:
      "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en",
    obligations: [
      {
        isNumberRaw: "IS 17631 : 2022",
        productLabel: "Office and Institutional Furniture — Chairs and Stools",
        scheme: "I",
        status: "MANDATORY",
        // Phased: 14 Feb 2026 for large enterprises, 14 Aug 2026 for MSMEs.
        enforcementDate: "2026-08-14",
        specificRequirement: "Large enterprises from 14 Feb 2026; MSMEs from 14 Aug 2026",
      },
      {
        isNumberRaw: "IS 17632 : 2022",
        productLabel: "Office and Institutional Furniture — Desks and Tables",
        scheme: "I",
        status: "MANDATORY",
        enforcementDate: "2026-08-14",
        specificRequirement: "Large enterprises from 14 Feb 2026; MSMEs from 14 Aug 2026",
      },
    ],
  },
];

/**
 * Horizontal / "omnibus" QCOs that confer mandatory status by scope description,
 * not by IS number (research doc §7.3). No IS-number lookup can resolve them, so
 * a product whose description matches one of these predicates is routed to human
 * review (`NEEDS_REVIEW`) rather than guessed. None of the five demo domains
 * match — this list exists to make the branch real, per docs/PRD.md §Pipeline
 * step 6.
 */
export interface HorizontalQco {
  id: string;
  title: string;
  /** Left empty where the gazette S.O. number is not yet transcribed — the
   * human reviewer this routes to looks it up. */
  soNumbers: string[];
  ministry: string;
  sourceUrl: string;
  /** Case-insensitive test against the procurement text. */
  matches: RegExp;
}

export const HORIZONTAL_QCOS: HorizontalQco[] = [
  {
    id: "household-appliances-2024",
    title:
      "Safety of Household, Commercial and Similar Electrical Appliances (Quality Control) Order, 2024",
    soNumbers: [],
    ministry: "Department for Promotion of Industry and Internal Trade",
    sourceUrl: "https://www.bis.gov.in/product-certification/",
    matches:
      /\b(household|domestic|kitchen|home)\b[\s\S]{0,40}\bappliance|\b(mixer[- ]?grinder|toaster|electric kettle|room heater|hair dryer)\b/i,
  },
  {
    id: "machinery-otr-2024",
    title:
      "Machinery and Electrical Equipment Safety (Omnibus Technical Regulation) Order, 2024",
    soNumbers: [],
    ministry: "Ministry of Heavy Industries",
    sourceUrl: "https://heavyindustries.gov.in/",
    matches:
      /\b(industrial machinery|machine tool|power press|injection moulding|earth[- ]?moving|overhead crane|gear box)\b/i,
  },
];
