/**
 * Hand-seeded demo catalogue — the ~15 Indian Standards the MVP demo runs on,
 * across the five locked demo domains (docs/PRD.md §Demo domains):
 * cement/concrete · structural steel · electronics/IT hardware · PPE/helmets ·
 * furniture.
 *
 * REVIEWED DATA FILE. Every row is an authoritative fact transcribed by hand
 * from the BIS catalogue and the research doc
 * (docs/research/sih26108-bis-ecosystem-data-archaeology.md). The LLM never
 * writes these. `summary` is a team-written paraphrase of scope — NEVER copied
 * clause text (BIS Act 2016 s.11).
 *
 * `bisStandardId` values here are placeholders in a private 9_000_00x range;
 * the full-catalogue harvest (ticket #7) replaces them with the real BIS
 * `standardId` and tops up the detail fields.
 */

export type DemoDomain =
  | "cement/concrete"
  | "structural steel"
  | "electronics/IT hardware"
  | "PPE/helmets"
  | "furniture";

export interface DemoStandard {
  bisStandardId: number;
  /** Designation exactly as it should be catalogued and cited. */
  number: string;
  title: string;
  series: string;
  editionYear: number;
  typeOfStandard: string;
  /** Sectional committee alias, stored on `group_name` until the taxonomy harvest lands. */
  committee: string;
  /** 2 = active/published, 5 = withdrawn/superseded (docs/research). */
  isStatus: number;
  /** Raw "superseded by" designation, when withdrawn. Resolved to an edge later. */
  supersededByRaw?: string;
  reaffirmationYear?: number;
  domain: DemoDomain;
  /** Team-written scope paraphrase. Feeds the 'C'-weighted lexical vector. */
  summary: string;
}

export const DEMO_STANDARDS: DemoStandard[] = [
  // ---- cement / concrete ------------------------------------------------------
  {
    bisStandardId: 9_000_001,
    number: "IS 456:2000",
    title: "Plain and Reinforced Concrete — Code of Practice",
    series: "IS",
    editionYear: 2000,
    typeOfStandard: "Code of Practice",
    committee: "CED 2",
    isStatus: 2,
    reaffirmationYear: 2021,
    domain: "cement/concrete",
    summary:
      "The design and construction code for plain and reinforced concrete structures: materials, mix, durability, structural design, detailing of reinforcement, formwork, and acceptance of concrete for buildings and civil works.",
  },
  {
    bisStandardId: 9_000_002,
    number: "IS 269:2015",
    title: "Ordinary Portland Cement — Specification",
    series: "IS",
    editionYear: 2015,
    typeOfStandard: "Product Specification",
    committee: "CED 2",
    isStatus: 2,
    domain: "cement/concrete",
    summary:
      "Requirements for 33, 43 and 53 grade ordinary Portland cement: composition, chemical and physical requirements, strength, setting time, soundness, packaging and marking. Amalgamates the earlier grade-wise OPC standards.",
  },
  {
    bisStandardId: 9_000_003,
    number: "IS 8112:2013",
    title: "Ordinary Portland Cement, 43 Grade — Specification",
    series: "IS",
    editionYear: 2013,
    typeOfStandard: "Product Specification",
    committee: "CED 2",
    isStatus: 5,
    supersededByRaw: "IS 269 : 2015",
    domain: "cement/concrete",
    summary:
      "Superseded grade-wise specification for 43 grade ordinary Portland cement. Its obligations moved to IS 269:2015 when the OPC grades were consolidated.",
  },
  {
    bisStandardId: 9_000_004,
    number: "IS 12269:2013",
    title: "Ordinary Portland Cement, 53 Grade — Specification",
    series: "IS",
    editionYear: 2013,
    typeOfStandard: "Product Specification",
    committee: "CED 2",
    isStatus: 5,
    supersededByRaw: "IS 269 : 2015",
    domain: "cement/concrete",
    summary:
      "Superseded grade-wise specification for 53 grade ordinary Portland cement, consolidated into IS 269:2015.",
  },
  {
    bisStandardId: 9_000_005,
    number: "IS 1489 (Part 1):1991",
    title: "Portland Pozzolana Cement — Specification: Part 1 Fly Ash Based",
    series: "IS",
    editionYear: 1991,
    typeOfStandard: "Product Specification",
    committee: "CED 2",
    isStatus: 2,
    reaffirmationYear: 2015,
    domain: "cement/concrete",
    summary:
      "Requirements for fly-ash-based Portland pozzolana cement: constituents, chemical and physical requirements, strength and fineness, suitable for general concrete construction.",
  },
  {
    bisStandardId: 9_000_006,
    number: "IS 10262:2019",
    title: "Concrete Mix Proportioning — Guidelines",
    series: "IS",
    editionYear: 2019,
    typeOfStandard: "Guidelines",
    committee: "CED 2",
    isStatus: 2,
    domain: "cement/concrete",
    summary:
      "Method for proportioning normal, standard and high-strength concrete mixes for a target strength and workability, including trial-mix adjustment and durability considerations.",
  },

  // ---- structural steel -----------------------------------------------------
  {
    bisStandardId: 9_000_007,
    number: "IS 800:2007",
    title: "General Construction in Steel — Code of Practice",
    series: "IS",
    editionYear: 2007,
    typeOfStandard: "Code of Practice",
    committee: "CED 7",
    isStatus: 2,
    reaffirmationYear: 2017,
    domain: "structural steel",
    summary:
      "The design code for structural steel in general building construction: limit-state and working-stress design of members and connections, stability, fatigue, fire resistance and fabrication of load-bearing steel frames.",
  },
  {
    bisStandardId: 9_000_008,
    number: "IS 2062:2011",
    title: "Hot Rolled Medium and High Tensile Structural Steel — Specification",
    series: "IS",
    editionYear: 2011,
    typeOfStandard: "Product Specification",
    committee: "MTD 4",
    isStatus: 2,
    domain: "structural steel",
    summary:
      "Grades, chemical composition and mechanical properties of hot-rolled structural steel plates, sections, flats and bars for welded, bolted and riveted structures such as bridges and building frames.",
  },
  {
    bisStandardId: 9_000_009,
    number: "IS 1786:2008",
    title:
      "High Strength Deformed Steel Bars and Wires for Concrete Reinforcement — Specification",
    series: "IS",
    editionYear: 2008,
    typeOfStandard: "Product Specification",
    committee: "MTD 4",
    isStatus: 2,
    domain: "structural steel",
    summary:
      "Requirements for high-strength deformed reinforcement bars (TMT / rebar) used in concrete: strength grades, elongation, bend and rebend performance, rib geometry, chemical limits and marking.",
  },
  {
    bisStandardId: 9_000_010,
    number: "IS 808:1989",
    title:
      "Dimensions for Hot Rolled Steel Beam, Column, Channel and Angle Sections",
    series: "IS",
    editionYear: 1989,
    typeOfStandard: "Product Specification",
    committee: "MTD 4",
    isStatus: 2,
    reaffirmationYear: 2019,
    domain: "structural steel",
    summary:
      "Standard dimensions, mass and sectional properties of hot-rolled I-beams, wide-flange columns, channels and angles used in structural steelwork.",
  },

  // ---- electronics / IT hardware ------------------------------------------
  {
    bisStandardId: 9_000_011,
    number: "IS 13252 (Part 1):2010",
    title:
      "Information Technology Equipment — Safety: Part 1 General Requirements",
    series: "IS",
    editionYear: 2010,
    typeOfStandard: "Product Specification",
    committee: "LITD 26",
    isStatus: 5,
    supersededByRaw: "IS/IEC 62368-1 : 2023",
    domain: "electronics/IT hardware",
    summary:
      "Superseded safety standard for information technology and business equipment — protection against electric shock, energy, fire and mechanical hazards. Replaced by the hazard-based IS/IEC 62368-1.",
  },
  {
    bisStandardId: 9_000_012,
    number: "IS 616:2017",
    title: "Audio, Video and Similar Electronic Apparatus — Safety Requirements",
    series: "IS",
    editionYear: 2017,
    typeOfStandard: "Product Specification",
    committee: "LITD 26",
    isStatus: 5,
    supersededByRaw: "IS/IEC 62368-1 : 2023",
    domain: "electronics/IT hardware",
    summary:
      "Superseded safety standard for mains- and battery-powered audio and video apparatus for domestic and similar use. Replaced by IS/IEC 62368-1.",
  },
  {
    bisStandardId: 9_000_013,
    number: "IS/IEC 62368-1:2023",
    title:
      "Audio/Video, Information and Communication Technology Equipment — Part 1: Safety Requirements",
    series: "IS/IEC",
    editionYear: 2023,
    typeOfStandard: "Product Specification",
    committee: "LITD 26",
    isStatus: 2,
    domain: "electronics/IT hardware",
    summary:
      "Hazard-based safety engineering standard for AV, IT and communication technology equipment — laptops, monitors, power adapters, networking and consumer electronics — covering electrical, thermal, fire, radiation and mechanical energy sources.",
  },

  // ---- PPE / helmets ------------------------------------------------------
  {
    bisStandardId: 9_000_014,
    number: "IS 4151:2015",
    title: "Protective Helmets for Two Wheeler Riders — Specification",
    series: "IS",
    editionYear: 2015,
    typeOfStandard: "Product Specification",
    committee: "TED 32",
    isStatus: 2,
    domain: "PPE/helmets",
    summary:
      "Construction, impact absorption, retention, penetration resistance, field of vision and labelling requirements for protective helmets worn by riders and pillion passengers of two-wheeled motor vehicles.",
  },
  {
    bisStandardId: 9_000_015,
    number: "IS 2925:1984",
    title: "Industrial Safety Helmets — Specification",
    series: "IS",
    editionYear: 1984,
    typeOfStandard: "Product Specification",
    committee: "CHD 8",
    isStatus: 2,
    reaffirmationYear: 2016,
    domain: "PPE/helmets",
    summary:
      "Requirements for industrial safety helmets (hard hats) protecting the head against falling objects and impact on construction sites and in factories: shell, harness, shock absorption and electrical insulation.",
  },

  // ---- furniture --------------------------------------------------------
  {
    bisStandardId: 9_000_016,
    number: "IS 17631:2022",
    title:
      "Office and Institutional Furniture — Chairs and Stools — Requirements and Test Methods",
    series: "IS",
    editionYear: 2022,
    typeOfStandard: "Product Specification",
    committee: "CED 55",
    isStatus: 2,
    domain: "furniture",
    summary:
      "Ergonomic, dimensional, strength, stability and durability requirements and test methods for office and institutional work chairs and stools, including swivel and height-adjustable task chairs.",
  },
  {
    bisStandardId: 9_000_017,
    number: "IS 17632:2022",
    title:
      "Office and Institutional Furniture — Desks and Tables — Requirements and Test Methods",
    series: "IS",
    editionYear: 2022,
    typeOfStandard: "Product Specification",
    committee: "CED 55",
    isStatus: 2,
    domain: "furniture",
    summary:
      "Dimensional, strength, stability and surface-durability requirements and test methods for office and institutional desks, workstations and tables.",
  },
];
