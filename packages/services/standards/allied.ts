/**
 * Allied-standards expansion (ticket #11, docs/PRD.md §Allied standards /
 * relationships, user stories 17–19).
 *
 * A recommended standard rarely stands alone — a complete tender specification
 * also has to name the standards it normatively depends on: the materials it
 * references, the methods its conformity clauses test against, the safety and
 * terminology companions. `standard_edges` holds that graph (harvested from
 * `getCrossRefDetails` for the demo slice, or hand-seeded); this module walks
 * the `REFERS_TO` and `PART_OF` edges out of a set of standards and tags each
 * neighbour with the role it plays.
 *
 * Role typing follows the build-approach doc: use the edge's curated
 * `props.role` where the harvest supplied one, otherwise classify from the
 * neighbour's own title and standard type. The BIS API does not sub-type its
 * cross-references beyond Indian / international, so the classifier is how a
 * "Methods of test …" companion becomes a `TEST_METHOD` rather than a bare
 * normative reference.
 *
 * Pure classifier + one read method on {@link StandardsService}. Exercised
 * through the `recommend.run` seam (pipeline.test.ts) and directly in
 * allied.test.ts.
 */
import { z } from "zod";

import { lifecycleStatusSchema } from "./model";

/**
 * Where an allied standard sits relative to the one that references it. A
 * subset of the reasoner's {@link standardRoleSchema} — an allied standard is
 * never the `PRIMARY` and never a bare `RELATED`, it always has a specific job
 * in the specification.
 */
export const alliedRoleSchema = z.enum([
  "NORMATIVE_REFERENCE",
  "TEST_METHOD",
  "SAFETY",
  "TERMINOLOGY",
  "INSTALLATION",
]);
export type AlliedRole = z.infer<typeof alliedRoleSchema>;

/** The edge types an allied-standards walk follows (docs/PRD.md pipeline step 4). */
export const ALLIED_EDGE_TYPES = ["REFERS_TO", "PART_OF"] as const;
export type AlliedRelation = (typeof ALLIED_EDGE_TYPES)[number];

export const alliedStandardSchema = z.object({
  /** Canonical designation of the allied standard. */
  number: z.string(),
  title: z.string(),
  /** The role it plays in a specification that cites the parent standard. */
  role: alliedRoleSchema,
  /** Which edge surfaced it — a normative reference, or a part of the same standard. */
  relation: z.enum(ALLIED_EDGE_TYPES),
  lifecycleStatus: lifecycleStatusSchema,
});
export type AlliedStandard = z.infer<typeof alliedStandardSchema>;

/** "Methods of test", "Methods of sampling", "… — Method of measurement". */
const TEST_METHOD_RE =
  /methods?\s+of\s+(test|sampling|measurement|analysis|chemical analysis)|test methods?|methods? of tests?/i;
/** A safety / protection standard. */
const SAFETY_RE = /\bsafety\b|protection against|protective\b/i;
/** Vocabulary / glossary / terminology. */
const TERMINOLOGY_RE = /terminology|glossary|vocabulary|nomenclature|\bdefinitions?\b/i;
/** Installation / erection / laying / commissioning guidance. */
const INSTALLATION_RE =
  /installation|erection|\blaying\b|commissioning|code of practice for (the )?(installation|use|laying|erection|construction)/i;

/**
 * Classify a standard's allied role from its title and type. Order matters —
 * "Methods of test" beats a generic "safety" mention, and a plain product
 * specification or code of practice falls through to `NORMATIVE_REFERENCE`
 * (the default job of a referenced standard).
 */
export function classifyAlliedRole(input: {
  title: string;
  typeOfStandard?: string | null;
}): AlliedRole {
  const haystack = `${input.title} ${input.typeOfStandard ?? ""}`;
  if (TEST_METHOD_RE.test(haystack)) return "TEST_METHOD";
  if (TERMINOLOGY_RE.test(haystack)) return "TERMINOLOGY";
  if (SAFETY_RE.test(haystack)) return "SAFETY";
  if (INSTALLATION_RE.test(haystack)) return "INSTALLATION";
  return "NORMATIVE_REFERENCE";
}

/**
 * Resolve an allied role: the edge's curated `props.role` when the harvest
 * supplied a valid one, otherwise the title/type classifier.
 */
export function resolveAlliedRole(
  props: unknown,
  dst: { title: string; typeOfStandard?: string | null },
): AlliedRole {
  const curated =
    props && typeof props === "object" && "role" in props
      ? alliedRoleSchema.safeParse((props as { role: unknown }).role)
      : null;
  return curated?.success ? curated.data : classifyAlliedRole(dst);
}
