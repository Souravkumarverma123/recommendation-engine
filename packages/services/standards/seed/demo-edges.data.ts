/**
 * Hand-seeded allied-standards graph for the demo slice (ticket #11).
 *
 * REVIEWED DATA FILE. Each row is a `REFERS_TO` (normative reference) or
 * `PART_OF` relationship between a demo standard and one of its companions,
 * with the role that companion plays in a tender specification. Same status as
 * `demo-standards.data.ts` and the QCO seed: a curated stand-in for the live
 * `getCrossRefDetails` harvest (`apps/harvester/src/details.ts`), so the
 * allied-standards feature works on a bare `pnpm db:seed` and in the seam
 * tests, before anyone points the harvester at the real BIS API.
 *
 * `crossRefData` from BIS is a *curated approximation* of the printed clause-2
 * list (docs/research §5) and does not sub-type its references — so these roles
 * are the team's reading of each companion's job, transcribed by hand from the
 * BIS catalogue. Titles are the BIS catalogue titles (numbers + titles are not
 * copyrightable); no clause text is stored.
 *
 * The `to` standards that are not themselves demo standards are inserted as
 * title-level catalogue rows in a reserved id band above the demo band, so a
 * re-seed of `demo-standards.data.ts` never prunes them.
 */
import type { AlliedRole, AlliedRelation } from "../allied";

/**
 * Reserved `bisStandardId` band for allied companion rows that are not demo
 * standards in their own right. Above `DEMO_BIS_ID_MAX` so the demo loader's
 * prune (which is scoped to the demo band) leaves them alone, and far above any
 * real BIS `standardId` (~24k).
 */
export const ALLIED_BIS_ID_MIN = 10_000_000;

export interface DemoEdge {
  /** Source designation — MUST be one of `DEMO_STANDARDS`. */
  from: string;
  /** Target designation, canonical form. */
  to: string;
  /** BIS catalogue title of the target (used to seed a title-level row if needed). */
  toTitle: string;
  /** BIS standard type of the target, when known. */
  toType?: string;
  relation: AlliedRelation;
  /** The role the target plays in a spec citing `from`. */
  role: AlliedRole;
}

export const DEMO_EDGES: DemoEdge[] = [
  // ---- IS 456:2000 — Plain and Reinforced Concrete, Code of Practice ---------
  {
    from: "IS 456:2000",
    to: "IS 269:2015",
    toTitle: "Ordinary Portland Cement — Specification",
    toType: "Product Specification",
    relation: "REFERS_TO",
    role: "NORMATIVE_REFERENCE",
  },
  {
    from: "IS 456:2000",
    to: "IS 1786:2008",
    toTitle:
      "High Strength Deformed Steel Bars and Wires for Concrete Reinforcement — Specification",
    toType: "Product Specification",
    relation: "REFERS_TO",
    role: "NORMATIVE_REFERENCE",
  },
  {
    from: "IS 456:2000",
    to: "IS 10262:2019",
    toTitle: "Concrete Mix Proportioning — Guidelines",
    toType: "Guidelines",
    relation: "REFERS_TO",
    role: "NORMATIVE_REFERENCE",
  },
  {
    from: "IS 456:2000",
    to: "IS 383:2016",
    toTitle: "Coarse and Fine Aggregate for Concrete — Specification",
    toType: "Product Specification",
    relation: "REFERS_TO",
    role: "NORMATIVE_REFERENCE",
  },
  {
    from: "IS 456:2000",
    to: "IS 516 (Part 1/Sec 1):2021",
    toTitle:
      "Hardened Concrete — Methods of Test: Part 1 Testing of Strength of Hardened Concrete, Section 1 Compressive, Flexural and Split Tensile Strength",
    toType: "Method of Test",
    relation: "REFERS_TO",
    role: "TEST_METHOD",
  },
  {
    from: "IS 456:2000",
    to: "IS 1199 (Part 1):2018",
    toTitle:
      "Fresh Concrete — Methods of Sampling, Testing and Analysis: Part 1 Sampling of Fresh Concrete",
    toType: "Method of Test",
    relation: "REFERS_TO",
    role: "TEST_METHOD",
  },
  {
    from: "IS 456:2000",
    to: "IS 4845:1968",
    toTitle: "Definitions and Terminology Relating to Hydraulic Cement",
    toType: "Terminology",
    relation: "REFERS_TO",
    role: "TERMINOLOGY",
  },

  // ---- IS 800:2007 — General Construction in Steel, Code of Practice ---------
  {
    from: "IS 800:2007",
    to: "IS 2062:2011",
    toTitle:
      "Hot Rolled Medium and High Tensile Structural Steel — Specification",
    toType: "Product Specification",
    relation: "REFERS_TO",
    role: "NORMATIVE_REFERENCE",
  },
  {
    from: "IS 800:2007",
    to: "IS 808:1989",
    toTitle:
      "Dimensions for Hot Rolled Steel Beam, Column, Channel and Angle Sections",
    toType: "Product Specification",
    relation: "REFERS_TO",
    role: "NORMATIVE_REFERENCE",
  },
  {
    from: "IS 800:2007",
    to: "IS 875 (Part 3):2015",
    toTitle:
      "Design Loads (Other Than Earthquake) for Buildings and Structures — Code of Practice: Part 3 Wind Loads",
    toType: "Code of Practice",
    relation: "REFERS_TO",
    role: "NORMATIVE_REFERENCE",
  },
  {
    from: "IS 800:2007",
    to: "IS 816:1969",
    toTitle:
      "Code of Practice for Use of Metal Arc Welding for General Construction in Mild Steel",
    toType: "Code of Practice",
    relation: "REFERS_TO",
    role: "INSTALLATION",
  },
  {
    from: "IS 800:2007",
    to: "IS 1367 (Part 3):2017",
    toTitle:
      "Technical Supply Conditions for Threaded Steel Fasteners: Part 3 Mechanical Properties of Fasteners Made of Carbon Steel and Alloy Steel",
    toType: "Product Specification",
    relation: "REFERS_TO",
    role: "NORMATIVE_REFERENCE",
  },

  // ---- IS 17631:2022 — Office and Institutional Furniture, Chairs and Stools -
  {
    from: "IS 17631:2022",
    to: "IS 3087:2005",
    toTitle:
      "Particle Boards of Wood and Other Lignocellulosic Materials (Medium Density) for General Purposes — Specification",
    toType: "Product Specification",
    relation: "REFERS_TO",
    role: "NORMATIVE_REFERENCE",
  },
  {
    from: "IS 17631:2022",
    to: "IS 1734 (Part 1):1983",
    toTitle:
      "Methods of Test for Plywood: Part 1 Determination of Density and Moisture Content",
    toType: "Method of Test",
    relation: "REFERS_TO",
    role: "TEST_METHOD",
  },
];
