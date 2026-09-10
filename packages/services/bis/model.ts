/**
 * Zod schemas for the BIS new-portal API (standardsadmin.bis.gov.in).
 * Shapes captured from real 2026-09-10 responses. The API is undocumented and
 * unversioned — every schema is permissive (nullish fields, passthrough) so a
 * new field upstream never breaks ingestion.
 */
import { z } from "zod";

const envelope = <T extends z.ZodTypeAny>(data: T) =>
  z
    .object({
      status: z.string(),
      statusCode: z.number(),
      msg: z.string().optional(),
      data: data,
    })
    .passthrough();

/* ------------------------------------------------------------------ *
 *  getWebsiteIndianStandardsList  (whole catalogue, paginated)
 * ------------------------------------------------------------------ */
export const bisListItemSchema = z
  .object({
    standardId: z.number(),
    standardEncId: z.string(),
    standardLabel: z.string().nullish(),
    standardNumber: z.string(),
    standardName: z.string().nullish(),
    departmentName: z.string().nullish(),
    sectionalCommitteeName: z.string().nullish(),
    typeOfStandardName: z.string().nullish(),
    publishedOn: z.string().nullish(),
    publishedOnFormatted: z.string().nullish(),
  })
  .passthrough();
export type BisListItem = z.infer<typeof bisListItemSchema>;

export const bisListResponseSchema = envelope(z.array(bisListItemSchema)).extend({
  totalRecord: z.number().nullish(),
  page: z.number().nullish(),
  pageSize: z.number().nullish(),
  hasMore: z.boolean().nullish(),
});

/* ------------------------------------------------------------------ *
 *  searchKnowStandards  (IS number -> encId + lifecycle status)
 * ------------------------------------------------------------------ */
export const bisSearchItemSchema = z
  .object({
    standardId: z.number(),
    standardNumber: z.string(),
    standardName: z.string().nullish(),
    standardNameInHindi: z.string().nullish(),
    departmentId: z.number().nullish(),
    committeeId: z.number().nullish(),
    publishedOn: z.string().nullish(),
    validUpto: z.string().nullish(),
    withdrawStatus: z.number().nullish(),
    withdrawOn: z.string().nullish(),
    isStatus: z.number().nullish(), // 2 = active/published, 5 = withdrawn/superseded
    matched_standard: z.string().nullish(),
    standardEncId: z.string(),
  })
  .passthrough();
export type BisSearchItem = z.infer<typeof bisSearchItemSchema>;

export const bisSearchResponseSchema = envelope(z.array(bisSearchItemSchema)).extend({
  totalRecords: z.number().nullish(),
});

/* ------------------------------------------------------------------ *
 *  getWebsiteStandardDetails  (full per-standard metadata)
 * ------------------------------------------------------------------ */
export const bisDetailSchema = z
  .object({
    rowStandardId: z.number().nullish(),
    pk_is_id: z.number().nullish(),
    standardNumber: z.string(),
    standardName: z.string().nullish(),
    shortTitle: z.string().nullish(),
    publishedOn: z.string().nullish(),
    committeeId: z.number().nullish(),
    departmentId: z.number().nullish(),
    groupName: z.string().nullish(),
    subGroupName: z.string().nullish(),
    subSubGroupName: z.string().nullish(),
    noOfRevision: z.string().nullish(),
    noOfAmendment: z.string().nullish(),
    typeOfStandardId: z.string().nullish(), // text despite the name
    languageId: z.string().nullish(),
    icsCode: z.string().nullish(),
    equivalenceTypeName: z.string().nullish(),
    equivalenceId: z.number().nullish(),
    equivalentIs: z.string().nullish(),
    identical_is: z.string().nullish(),
    supersheed: z.string().nullish(),
    superseded_byis: z.string().nullish(),
    reAffirmationYear: z.string().nullish(),
    reviewOn: z.string().nullish(),
    withdrawStatus: z.number().nullish(),
    withdrawOn: z.string().nullish(),
    isStatus: z.number().nullish(),
    certificationName: z.string().nullish(),
    committeeName: z.string().nullish(),
    committeePreparedName: z.string().nullish(),
    departmentName: z.string().nullish(),
    deptAliasName: z.string().nullish(),
    is_documents: z.string().nullish(),
    is_hindi_document: z.string().nullish(),
    reviewList: z.array(z.record(z.string(), z.unknown())).nullish(),
  })
  .passthrough();
export type BisDetail = z.infer<typeof bisDetailSchema>;

export const bisDetailResponseSchema = envelope(bisDetailSchema);

/* ------------------------------------------------------------------ *
 *  getAmendmentDetails
 * ------------------------------------------------------------------ */
export const bisAmendmentSchema = z
  .object({
    standardId: z.number(),
    standardNumber: z.string(),
    noOfAmendment: z.number(),
    amendmentYear: z.string().nullish(),
    is_documents: z.string().nullish(),
    amendmentLabel: z.string().nullish(),
  })
  .passthrough();
export type BisAmendment = z.infer<typeof bisAmendmentSchema>;

export const bisAmendmentResponseSchema = envelope(z.array(bisAmendmentSchema)).extend({
  totalAmendments: z.number().nullish(),
});

/* ------------------------------------------------------------------ *
 *  getCrossRefDetails  (forward + reverse citation graph)
 * ------------------------------------------------------------------ */
export const bisCrossRefSchema = z
  .object({
    standardId: z.number(),
    standardNumber: z.string(),
    standardName: z.string().nullish(),
    equivalent_is: z.string().nullish(),
    identical_is: z.string().nullish(),
    reviewOn: z.string().nullish(),
    noOfReview: z.string().nullish(),
    isType: z.number().nullish(), // 1 Indian, 2 international, 3 other-Indian, 4 doc-number, 5 reverse
    typeLabel: z.string().nullish(),
    standardEncId: z.string().nullish(),
  })
  .passthrough();
export type BisCrossRef = z.infer<typeof bisCrossRefSchema>;

export const bisCrossRefResponseSchema = envelope(
  z.object({
    crossRefData: z.array(bisCrossRefSchema).nullish(), // forward: "refers to"
    crossFollowRefData: z.array(bisCrossRefSchema).nullish(), // reverse: "referred to by"
  }),
);

/* ------------------------------------------------------------------ *
 *  getwebsiteAllSectionalCommittees  (data is an array of JSON STRINGS)
 * ------------------------------------------------------------------ */
export const bisCommitteeSchema = z
  .object({
    committeeId: z.number(),
    committeeName: z.string(),
    committeeNumber: z.string(),
    departmentId: z.number().nullish(),
    aliasName: z.string().nullish(),
    convertedName: z.string().nullish(),
  })
  .passthrough();
export type BisCommittee = z.infer<typeof bisCommitteeSchema>;

export const bisCommitteesResponseSchema = envelope(z.array(z.string()));
