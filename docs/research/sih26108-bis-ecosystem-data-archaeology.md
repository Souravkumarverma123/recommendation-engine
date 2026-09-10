# SIH26108 — BIS Ecosystem & Data Archaeology

> **Problem statement:** AI-Powered Recommendation Engine for Identifying Applicable Indian Standards for Procurement Specifications.
> **Organisation:** Department of Consumer Affairs (DoCA), Ministry of Consumer Affairs, Food & Public Distribution, Government of India.
> **Research date:** 2026-09-10. All URLs accessed on this date unless noted.
> **Method:** Primary-source investigation — BIS statutes/rules/manuals, live BIS portals, gazette notifications, PIB releases. Live pages were loaded and their network traffic inspected where possible. Access barriers are recorded as findings.

---

## Status of this document

This report synthesises **four** parallel research threads:

| Thread | Scope | Status |
|---|---|---|
| Certification / QCO / CRS / hallmarking / licensee data | Sections 7, parts of 9–10, 13 | ✅ Complete |
| Standard lifecycle / amendments / reaffirmation / withdrawal / supersession / dual-numbering | Sections 6, parts of 4–5, 13 | ✅ Complete |
| Government procurement context / copyright & licensing | Sections 8, 12 | ✅ Complete |
| BIS portal archaeology / standard metadata / relationships / document content / data.gov.in | Sections 2–5, 11 | ✅ Complete |

All four threads are complete. Every section is final.

---

## Executive Summary

**The two findings that matter most:**

1. **The full Indian Standards catalogue IS harvestable — without authentication.** The new BIS Angular portal (`standards.bis.gov.in`) is backed by a Laravel/Lumen API whose read endpoints are **unauthenticated, CORS-open (`access-control-allow-origin: *`), unthrottled, and paginated**. `POST https://standardsadmin.bis.gov.in/proposal-service/getWebsiteIndianStandardsList` with `{"page":N,"pageSize":100}` returns the entire catalogue — **`totalRecord: 24145` on 2026-09-10** — in 242 requests. Per-standard detail, amendment history (with PDF keys), lifecycle status, and **a forward + reverse cross-reference graph** are all reachable the same way. This is not a documented API and carries no stability guarantee, but it is a genuine de-facto open API and it is far richer than anything BIS publishes as "open data".

2. **The regulatory overlay is still almost entirely un-datafied.** The Government regulates ~769 products through 187 Quality Control Orders, and the entire machine-readable QCO surface is **four HTML tables** on `bis.gov.in` (Scheme I/II/X + "Upcoming QCOs") plus ~531 gazette PDFs. Linking a standard to its regulatory status still means scraping tables and parsing PDF prose. That gap *is* the problem SIH26108 asks you to solve.

**On data access:**

- **No *documented* public BIS API exists**, and `data.gov.in` hosts **no verified BIS dataset**. But the new portal's backend endpoints (§2.2, §11) are a working, unauthenticated JSON API. On the *legacy* host, `getData.php` remains a clean JSON IS-number → designation resolver.
- BIS runs **three overlapping public properties**: the new Angular portal (`standards.bis.gov.in` — now the primary source: 24,145 records, the cross-ref graph, the committee master list); the legacy services portal (`services.bis.gov.in` — frozen for new content since 2025-10-01, but its per-committee reaffirmation/withdrawal DataTables still work and its `commttid` is just `base64(committeeId)`); and the BSB Edge e-sale storefront (`standardsbis.bsbedge.com` — search-only, "Login to Download" even for ₹0 standards, adds only a price column).
- **These sources disagree on standard status** (e.g. `IS 516 : 1959` — "withdrawn" on the services portal, "Active" on BSB Edge). Prefer the new portal's `isStatus`/`withdrawStatus` fields, cross-check against the Gazette, and surface conflicts.
- Full standard **text** is copyrighted (BIS Act 2016 s.11 — fine up to ₹5,00,000, no fair-dealing carve-out). **Metadata is factual and safe.** The only free full-text corpus is `law.resource.org/pub/in/bis/` (broad but frozen ~2018). BIS has a live NISO-STS **XML-conversion RFP** ("SMART standards") — a future official machine-readable feed is plausible but not public yet.

**On lifecycle logic:** the naive rule "*highest year = latest valid version*" is **wrong in at least seven distinct, evidenced ways**. Validity in Indian law ends only on withdrawal (BIS Act s.10(4)), not with age. Two editions of the same standard can be simultaneously valid ("concurrent running", Rule 28). A record can be flagged "withdrawn" and still be in force during a transition window. The superseding standard can have a *lower* IS number (three OPC standards were amalgamated into `IS 269 : 2015`). The engine must resolve a bare "IS N" citation to the correct **part/section**, follow supersession as a **graph**, and treat status as **multi-source with conflicts**.

**On what to build:** separate **authoritative facts** (IS number, title, year, status, amendments, supersession, QCO applicability, enforcement date — must come from scraped structured data, never an LLM) from **AI reasoning** (understand the procurement requirement, extract technical parameters, expand terminology, generate queries, rank, explain, flag gaps). A prototype over a **curated slice of 200–500 standards across 4–5 demo domains** — with the mandatory-vs-voluntary contrast front and centre — is both achievable and genuinely impressive.

---

## 1. What BIS Actually Provides

BIS's public output, from the perspective of a system builder, is four distinct things living in four different places:

1. **The catalogue** — ~22,689 Indian Standards in force (PIB / Lok Sabha written reply, Ministry of Consumer Affairs, 12 March 2025, [PRID 2110935](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2110935)); the new portal's own count is **24,145 records** (incl. SP publications and dual-numbers). **Fully harvestable** via the new portal's unauthenticated JSON API (`standardsadmin.bis.gov.in`, §2.2); also browsable on `standardsbis.bsbedge.com` and the frozen legacy `services.bis.gov.in`.
2. **The regulatory overlay** — 187 Quality Control Orders covering 769 products (same PIB source). Published as four HTML tables on `bis.gov.in/product-certification/...` plus individual gazette PDFs.
3. **The lifecycle record** — established / revised / amended / reaffirmed / withdrawn / superseded status, per standard, notified in the Gazette of India and (partially, inconsistently) surfaced on the portals.
4. **The conformity data** — who holds a BIS licence for which standard. Bulk-published for *foreign* manufacturers only (`services.bis.gov.in/php/BIS_2.0/fmcs/All_fmcs_list.php`, 3,160 rows, no auth); domestic ISI licensees are one-at-a-time behind a CAPTCHA.

### 1.1 The legal skeleton (verified from the Act, Rules and Manual)

| Instrument | URL | What it fixes |
|---|---|---|
| **BIS Act, 2016** | [bis.gov.in/.../BIS-Act-2016-Bilingual.pdf](https://www.bis.gov.in/wp-content/uploads/2020/12/BIS-Act-2016-Bilingual.pdf) | s.10(1) "standards established by the Bureau shall be the Indian Standards"; **s.10(4) "The Indian Standard shall be notified and remain valid till withdrawn by the Bureau"**; s.11(1) no publish/reproduce/record without authorisation; s.16 power to notify compulsory use; s.25 prohibition on manufacture/sale without Standard Mark |
| **BIS Rules, 2018** | [bis.gov.in/.../BIS-Rules-2018_amendments_Sep_15102020.pdf](https://www.bis.gov.in/wp-content/uploads/2020/10/BIS-Rules-2018_amendments_Sep_15102020.pdf) | Rule 15 (reaffirm/amend/revise/withdraw, all by Gazette); Rule 22(4) (draft circulated ≥1 month, waivable); **Rule 23** (review ≥ once in 5 years); **Rule 24** (IS are voluntary *unless* stipulated in a contract, referred to in legislation, or made mandatory by Govt order); Rule 25 (published for sale); **Rule 27** (Provisional Indian Standard: ≤2+2 yrs, no Standard Mark, lapses); **Rule 28** (Concurrent Running of two versions of an IS, or an IS and its amendments); Rule 29 (adoption of ISO/IEC → dual numbering) |
| **Manual for Standards Formulation, 2022 (2nd Revision)** | [bis.gov.in/.../Revised-SFM.pdf](https://www.bis.gov.in/wp-content/uploads/2022/12/Revised-SFM.pdf) | Drafting stages (NWIP → WD → P → WC → IS/SP); cl 8.4.1 review within 5 years (3 for LITD) of publication *or last reaffirmation*; cl 8.4.4 ≤5 amendments per edition, revise by the 3rd; cl 8.4.6 withdrawal by gazette; cl 8.5.2 concurrent-running periods |
| **IS 12 : 2005 — Guide for Drafting and Presentation of Indian Standards** | [law.resource.org/pub/in/bis/S07/is.12.2005.pdf](https://law.resource.org/pub/in/bis/S07/is.12.2005.pdf) | cl 5.1.2.2 (IS number retained across revisions; new number only if scope substantially altered, old number frozen); cl 5.2 (part/section numbering); cl 9.2.1 (cover-page status tokens: "Superseding IS…", "(Reaffirmed YYYY)", "(First Revision)", "Incorporating Amendments No. …"); cl 11.1 (amendments numbered sequentially from 1 per edition; designation never changed by amendment); cl 16 (an amendment can break IS/ISO dual-number identity) |

**Rule 24 is the procurement hook.** An Indian Standard is voluntary *by default* and becomes binding in exactly three ways: (a) a contract stipulates it, (b) legislation refers to it, or (c) a Government order (a QCO) makes it mandatory. The recommender's "mandatory vs relevant" flag is a direct encoding of Rule 24.

---

## 2. BIS Standards Portal

BIS operates **three** public-facing standards properties, and they are not consistent with one another. **The new Angular portal (§2.2) is the primary machine-readable source; the other two are for cross-checking.**

### 2.1 Legacy services portal — `www.services.bis.gov.in/php/BIS_2.0/`

Server-rendered PHP + DataTables. **Frozen for new content as of 2025-10-01** — a banner on the site reads *"All the standards published after 01 Oct 2025 are available in [the] new portal"* and links to `standards.bis.gov.in/website/know-your-standards`.

**Public endpoints that work without login (verified):**

| Endpoint | Returns | Notes |
|---|---|---|
| `GET .../bisconnect/standard_review/Standard_review/all_reaff_stndrd_commtt?commttid=<b64>&commttname=<b64>` | Reaffirmation list for one sectional committee | Columns: `S.No. \| IS Number \| IS Title \| Reaffirmation Year \| Category \| Document \| Comment`. **`commttid` = `base64(committeeId)`**, the plain integer from the new portal's 415-row committee master list — verified `base64("190")="MTkw"` (CED 2), `base64("286")="Mjg2"` (MSD 3). `commttname` is display-only |
| `GET .../standard_review/Standard_review/all_withdrawn_stndrd_commtt?commttid=<b64>&commttname=<b64>` | Withdrawn list for one committee | Columns: `S.No. \| IS Number \| IS Title \| Category \| Superseded By` |
| `GET .../standard_review/Standard_review/all_revised_stndrd_commtt?commttid=<b64>&commttname=<b64>` | Revised-standards list for one committee | (same shape) |
| `GET .../standard_review/Standard_review/dep_commtt?depid=<b64>&depname=<b64>` | Committee roll-up for one technical department | Dashboard totals observed: **21 reaffirmed / 10,676 revised / 11,277 withdrawn** across all departments |
| `GET .../knowyourstandards/Indian_standards/isdetails_mnd/<pk_is_id>` | **Full bilingual detail page — no login, no 303** | "Basic Details" exposes IS Number, Title, **Superseding IS**, **Degree of Equivalence**, No. of Revisions, No. of Amendments, Aspect, Language, Reaffirmation Year, Technical Department, Technical Committee, Member Secretary + PDF/amendment/gazette download links. **`pk_is_id` ≠ `standardId`** (IS 456 → `pk_is_id` 11249 vs `standardId` 11248). Still no standard scope text |
| `GET .../fmcs/getData.php?tag=<partial IS number>` | **Clean JSON** IS-number resolver | `[{"id":"269","name":"IS 269 : 2015"},{"id":"1269.001","name":"IS 1269 : Part 1 : 1997 "}]` — `id` numeric, `.001`/`.002` suffix = part number, `name` = canonical designation *with edition year*. **The single most useful endpoint for normalising messy tender text.** |
| `GET .../fmcs/getVariety.php?cmlno=<CML No>` | HTML fragment: licence scope text | e.g. "Ordinary Portland Cement - 53 Grade and 43 Grade" |
| `GET .../fmcs/All_fmcs_list.php` | **Full foreign-manufacturer licensee list**, ~3,160 rows, no auth, 2 MB HTML | Columns: `S No \| CML No \| Name & Address \| Validity Date \| Standard No \| Status \| Variety/Brand Names`. 424 distinct IS numbers; 2,719 Operative + 414 Deferred |

**Blocked / redirecting (verified):**

- `POST .../knowyourstandards/Indian_standards/searchIS` → **HTTP 303** redirect to `/bisconnect/`, with or without a `BISID` session cookie. The IS-detail rows (which carry `amendments`, `technical_committee`, `aspect`, `withdrawn_status`, `Degree of Equivalence`) are **not directly fetchable** this way.
- `POST .../knowyourstandards/Indian_standards/isdetails/` → HTTP 200 but renders "Number of results : 0" — the page is a shell; rows come only from the blocked AJAX call.
- `.../dgdashboard/Draft_report/Report_common_page` → **404**. `.../WCDraft/wcdraft.php` → **404**.

The services-portal IS-detail DataTable's JavaScript exposes these field keys (from the client bundle): `is_no`, `is_title`, `amendments`, `technical_committee`, `aspect`, `referirmatin_year` *(sic — misspelled in the live code)*, `withdrawn_status` (value `"W"`/`"w"`, rendered red). Visible result-table headers: `IS No. | IS Title | Amendments | Technical Committee | Aspect | Degree of Equivalence | Reaffirmation Year`.

### 2.2 New Angular portal — `standards.bis.gov.in/website/` — **the primary data source**

Angular SPA serving an identical ~39 KB shell per route; all content loads via XHR from a **Laravel/Lumen 9** backend on `standardsadmin.bis.gov.in` (services: `auth`, `master-service`, `review-service`, `proposal-service`, `technical-committee`, `project-service`, `meeting-service`, …) and `standardsmodule.bis.gov.in` (`cms-service`, `consultation-service`, …). PDFs live in an **Oracle OCI (Mumbai) MinIO bucket**; API responses give relative keys like `BisProd/bisProd/oldStandards/S03/S03V01/456.pdf`.

Standard-detail *pages* are keyed by a Laravel `encrypt()` blob (`standardEncId` — `{iv, value, mac}`), so you cannot build a detail URL from an IS number **in the browser**. But that does not matter, because **the backend read endpoints are open**:

**Every endpoint below verified 2026-09-10 with plain `curl` — no auth header, no cookie, no API key; `POST`, `Content-Type: application/json`; `access-control-allow-origin: *`; no rate limiting observed at ~1–2 req/s.**

| Endpoint (`POST https://standardsadmin.bis.gov.in/…`) | Body | Returns |
|---|---|---|
| `proposal-service/getWebsiteIndianStandardsList` | `{"page":N,"pageSize":100}` (server caps size at 100); optional `{"search":"456"}` substring on number+title | **The entire catalogue.** `totalRecord: 24145`, `hasMore`, sorted by `publishedOn` DESC, includes SP publications and IS/IEC & IS/ISO dual-numbers. 10 fields/row incl. `standardId` (int PK), **`standardEncId`** (needed for detail calls), `standardNumber`, `standardName`, `departmentName`, `sectionalCommitteeName`, `typeOfStandardName`, `publishedOn`. **242 requests = whole catalogue.** |
| `review-service/searchKnowStandards` | `{"searchText":"IS 456:2000"}` | IS-number → `standardEncId` resolver. Adds `validUpto`, `withdrawStatus`/`withdrawOn`, **`isStatus`** (2 = active/published, 5 = withdrawn/superseded — verified: `IS 3021:1975` → `isStatus 5`), numeric `departmentId`/`committeeId` |
| `review-service/getWebsiteStandardDetails` | `{"encId":"<standardEncId>","fromPage":"guestUserPage"}` | Full metadata object — see §4.1 for the verbatim field list. **No scope text, no reference list.** |
| `review-service/getCrossRefDetails` | `{"encId":"<standardEncId>","fromPage":"guestUserPage"}` | **`crossRefData`** = forward references (`isType`: 1 Indian / 2 international / 3 other-Indian / 4 document-number) **AND `crossFollowRefData`** = **reverse references** (`isType 5` — "standards that cite this one"). `IS 456` → 65 forward, **197 reverse**. Each entry carries its own `standardEncId` → **the graph is directly traversable.** *This is the only BIS surface anywhere that exposes reverse references.* |
| `review-service/getAmendmentDetails` | `{"standardId":"<standardEncId>"}` (the **encrypted** id — int → 422) | `totalAmendments` + per-amendment `noOfAmendment`, `amendmentYear`, `amendmentLabel`, `is_documents` (PDF key) |
| `review-service/getGazettedetails` | `{"standardId":"<encId>",…}` | **Populated** for regulated standards (e.g. IS 269) — S.O. number + gazette PDF key |
| `technical-committee/getwebsiteAllSectionalCommittees` | `{}` | **Master list — 415 sectional committees**, each with numeric `committeeId`, `committeeNumber`, `aliasName` (e.g. `CED`), `convertedName` (`CED 32 - Prefabricated Construction`) |
| `master-service/fetchDepartmentList` | `{}` | All technical departments + `deptAliasName` + **department-level `scope` text** |
| `master-service/getSector` / `getSubsector` | `{}` | ~400+ sectors / sub-sectors |

**Auth-gated (findings):** Excel bulk export (`review-service/downloadPublishedStandardsListExcel`, `verifyExcelDownloadPermission`) is permission-checked — use the JSON pagination instead. `getStandardCRSDetails` / `getStandardMCSDetails` / `getStandardLicenseDetails` returned SUCCESS-but-empty unauthenticated on all samples — the populated licensee/CRS data is behind auth (consistent with §7.5–7.6). Direct GET of the OCI MinIO PDF bucket is **UNVERIFIED** — the download route almost certainly wraps the key with auth/watermarking ("Login to Download" model).

**The banner** ("standards published after 01 Oct 2025 are in the new portal") is effectively moot: `getWebsiteIndianStandardsList` already returns the **union** — it lists 2026 publications *and* `SP 9:1973`.

### 2.3 BSB Edge e-sale catalogue — `standardsbis.bsbedge.com`

The official BIS sales storefront (operated by BSB Edge). **A search-only WebForms storefront — not a bulk source, and superseded by the new portal's API for our purposes.** It adds exactly one thing the APIs lack: a **price** column.

- `GET BIS_SearchStandard.aspx?Standard_Number=<n>&id=0` — prefix search. **The `&id=0` is undocumented but required**; without it the page throws **HTTP 500**. No page-number querystring, no list endpoint (`__VIEWSTATE`/`__EVENTVALIDATION` WebForms) — **cannot be paged**.
- `GET BIS_Withdrawn.aspx`, `GET BIS_FreeAmendments.aspx?id=0` — still load.
- **Every "Download" action → "Login to Download"**, even for ₹0.00 Indian Standards — a free account is required and it **cannot be bypassed via querystring**.
- Indigenous IS show ₹0.00; **ISO/IEC adoptions are priced** (`IS/IEC 60947 : Part 1 : 2020` ₹3,270 in India / ₹32,700 outside; `IS/ISO 9001 : 2015` ₹560). Any pipeline assuming "all IS are free" breaks on the IS/ISO and IS/IEC subset.

---

## 3. Know Your Standard

"Know Your Standard" (KYS) is the search UI on both portals. **On the new portal it is backed by an open endpoint** — `POST review-service/searchKnowStandards` `{"searchText":"IS 456:2000"}` — which returns `standardId`, `standardNumber`, `standardName`, `departmentId`, `committeeId`, `publishedOn`, **`validUpto`**, **`withdrawStatus`/`withdrawOn`**, **`isStatus`** (2 = active, 5 = withdrawn/superseded), and the `standardEncId` needed for every detail call. This is the recommended IS-number → record resolver (§2.2).

The legacy KYS row data still sits behind a 303-redirecting AJAX endpoint (`Indian_standards/searchIS`), but the legacy `isdetails_mnd/<pk_is_id>` detail page (§2.1) renders without login and exposes Superseding IS, Degree of Equivalence, revision/amendment counts, reaffirmation year, committee and department. **Neither KYS surface exposes scope text or the clause-2 reference list** — for relationships use `getCrossRefDetails` (§5).

---

## 4. Standard Metadata

### 4.1 The full field set — `review-service/getWebsiteStandardDetails` (verbatim, IS 456:2000, 2026-09-10)

| Field | Value |
|---|---|
| `standardNumber` | `IS 456:2000` |
| `standardName` | `Plain and reinforced concrete - Code of practice (Fourth Revision)` |
| `shortTitle` | `Concrete Code` |
| `publishedOn` | `2000-07-31` |
| `rowStandardId` / `pk_is_id` | `11248` / `11249` |
| `noOfRevision` | `04` |
| `noOfAmendment` | `06` |
| `typeOfStandardId` | `Code of Practice` *(text, despite the `Id` name)* |
| `languageId` | `English` |
| `icsCode` | `null` *(null on most legacy records — BIS uses its own group taxonomy instead)* |
| `groupName` / `subGroupName` / `subSubGroupName` | `Building Materials including Paints` / `Cement, concrete and Allied Products` / `Concrete, Concrete admixtures & additives and testing` |
| `sectorName` / `subSectorName` | `""` / `""` *(populated on newer records)* |
| `equivalenceTypeName` / `equivalenceId` | `Not Equivalent` / `4` |
| `equivalentIs` / `identical_is` | `null` / `null` |
| `supersheed` / `superseded_byis` | `""` / `null` *(sparse on legacy records)* |
| `reAffirmationYear` / `reviewOn` | `2025-07-12` / `2025-07-12` |
| `withdrawStatus` / `withdrawOn` | `0` / `null` |
| `isStatus` | `2` |
| `certificationName` | `""` *(empty on all samples — QCO/CRS linkage comes from §7 tables, not here)* |
| `committeeName` / `committeePreparedName` | `Cement And Concrete` / `CED 02 - Cement And Concrete` |
| `departmentName` / `deptAliasName` | `CIVIL ENGINEERING DEPARTMENT` / `CED` |
| `memberDisplayName` | `Mr. Jitendra Kumar Chaudhary (SCIENTIST-C)` |
| `commentCount` | `15` |
| `is_documents` / `is_hindi_document` | `BisProd/bisProd/oldStandards/S03/S03V01/456.pdf` / `null` |
| `reviewList[]` | array of `{isStatus, standardNumber}` review-history stubs |
| **`scope`** | **ABSENT** |
| **`price` / `noOfPages`** | **ABSENT** (BSB-Edge-only commercial fields) |
| **referred / normative references** | **ABSENT here** — use `getCrossRefDetails` (§5) |

So a **rich structured metadata layer is fully harvestable without auth**: number, title, year, status, withdrawal, revision count, amendment count + years + PDF keys, reaffirmation year, review date, committee, department, a 3-level group taxonomy, ISO/IEC equivalence, supersession pointer, **and the forward + reverse cross-reference graph** (§5).

### 4.2 What is NOT in any metadata (PDF-body only — verified)

- **Scope text** (clause 1)
- **The clause-2 "References" list verbatim** — `getCrossRefDetails.crossRefData` is a *curated* relationship list, close but not identical to the printed clause 2
- **Test-method, safety, installation/maintenance, terminology, marking/sampling clause detail**
- **True ICS code** on legacy records (`icsCode` is usually `null`; the BIS group/sub-group taxonomy *is* populated and is the usable substitute)

### 4.3 Metadata gotchas (verified)

- **`aspect` field is wrong sometimes:** `IS 1489 : PART 1 : 1991` (Portland Pozzolana Cement — a *specification*) is tagged "Methods of tests"; `IS 455 : 1989` (Portland Slag Cement spec) is tagged "Code of Practice".
- **Reaffirmation year is retained on withdrawn records:** `IS 1199 : 1959` shows "(Reaffirmed Year : 2018)" *and* status withdrawn. Presence of a reaffirmation year is **not** evidence of currency.
- **Status token can be buried inside the designation string:** `IS 733 (Active,Concurrent Running) : 1983`, `IS 18879 : Part 6 - (Active) : 2024`.
- **Designation formatting varies within BIS's own systems:** `IS 516 (Part-5/Sec-1) : 2018` (services) vs `IS 516 : Part 5 : Sec 1 : 2018` (BSB Edge); upper/lower case; dropped "IS " prefix; `IS/IEC 60947 : Part 6 : Sec 1 : 2021 ( IS/IEC 60947-6-1:2021)` — an outright data error where the ISO/IEC field repeats the "IS" prefix.

---

## 5. Standard Relationships

**The pivotal finding: the new portal exposes the relationship graph — including reverse references — as structured data.** `POST review-service/getCrossRefDetails` `{"encId":"<standardEncId>","fromPage":"guestUserPage"}` returns, for one standard, both directions:

- **`crossRefData`** — forward references ("this standard refers to …"). `isType`: 1 = Indian, 2 = international (ISO/IEC), 3 = other-Indian, 4 = document-number. IS 456 → **65 entries**.
- **`crossFollowRefData`** — **reverse references** ("standards that refer to this one", `isType 5`). IS 456 → **197 entries**.
- Every entry carries its own `standardEncId`, so **the graph is directly traversable** — recurse to build the full neighbourhood.

This is a *curated* relationship list maintained by BIS, not a verbatim scrape of the printed clause 2 — it is close, and good enough for allied-standard discovery, but full precision on "exactly which standards clause 2 lists" still needs the PDF.

| Relationship | Where it lives | How to get it | Confidence |
|---|---|---|---|
| **REFERS_TO** (forward / normative) | **Structured** — `getCrossRefDetails.crossRefData` (new portal, unauth). Also PDF clause 2 | one API call per standard | High (curated) |
| **REFERENCED_BY** (reverse) | **Structured** — `getCrossRefDetails.crossFollowRefData`. **Exists only here** — not on the legacy portal, not on BSB Edge | same call | High |
| **AMENDED_BY** | **Structured** — `getAmendmentDetails` → year + `amendmentLabel` + PDF key; `noOfAmendment` count on the detail object | one API call | High. Amendment *text* is PDF-only, login-gated |
| **SUPERSEDES / SUPERSEDED_BY** | **Structured field** — `getWebsiteStandardDetails.superseded_byis` / `supersheed`; `searchKnowStandards.isStatus`=5; legacy `isdetails_mnd` "Superseding IS" row. **Sparse/blank on many legacy records** → back-fill from title revision text + `reviewList` + the legacy per-committee withdrawn tables (whose "Superseded By" values are dirty) | API + cleanup + title parsing | Medium |
| **REAFFIRMED** | **Structured** — `reAffirmationYear` / `reviewOn` on the detail object; legacy `all_reaff_stndrd_commtt` per committee | API | High |
| **REVISED** | **Structured** — `noOfRevision`; ordinal embedded in `standardName` ("(Fourth Revision)"); legacy `all_revised_stndrd_commtt` | API + parse | High |
| **WITHDRAWN** | **Structured** — `withdrawStatus` / `withdrawOn` / `isStatus`=5; legacy `all_withdrawn_stndrd_commtt`; `BIS_Withdrawn.aspx` | API | High |
| **BELONGS_TO** committee | **Structured** — `committeeId` (int) + `committeePreparedName` on every record; master list `getwebsiteAllSectionalCommittees` (415) | API | High |
| **CLASSIFIED_UNDER** | **`icsCode` usually null**; the BIS `groupName` / `subGroupName` / `subSubGroupName` taxonomy **is** populated and is the working substitute; true ICS → PDF cover page | API (taxonomy) | High for taxonomy, low for ICS |
| **EQUIVALENT_TO / IDENTICAL_TO** (ISO/IEC) | **Structured** — `equivalentIs`, `identical_is`, `equivalenceTypeName`, `equivalenceId`; dual-number in `standardNumber` | API | Medium |
| **PART/SECTION siblings** | Inferable from `standardNumber` ("IS 456 (Part 1)"); no explicit sibling field; `{"search":"456"}` on the bulk endpoint returns the family | string parse | High |

**Architectural implication (now settled):** every relationship the "standards knowledge graph" needs — **including REFERS_TO and REFERENCED_BY** — is populatable from the new portal's unauthenticated API. The graph does **not** require corpus-wide PDF NLP. PDF text is needed only to (a) get clause-2 exactness, and (b) type the references as test-method / safety / installation (the API does not sub-type them beyond Indian/international).

---

## 6. Standard Lifecycle

*(Thread complete.)*

### 6.1 Official lifecycle states

**Drafting pipeline** (Manual for Standards Formulation 2022, Table 1, cl 8.2.1):

```
NWIP (New Work Item Proposal)
  → WD (Working Draft)
    → P (Preliminary Draft — "restricted access, not publicly available", cl 465)
      → WC (Wide Circulation Draft — public, ≥1 month, Rule 22(4))
        → F Draft / F-copy (publication-internal, cl 8.5.1)
          → IS / SP  (Established — notified in the Gazette of India, Rule 15(2))
```

Stages can be skipped (e.g. both preparatory + committee stages skipped when adopting an existing ISO/IEC standard).

**Post-publication states** (each standard cycles through these repeatedly):

| State | Trigger | Effect on designation | Effect on validity |
|---|---|---|---|
| **Reaffirmed (YYYY)** | 5-yearly review (3 yrs for LITD), committee finds no change needed | None — year in designation unchanged | Remains valid; review clock resets |
| **Amended** (Amendment No. *n*) | Correction / minor change, "if a revised edition is not called for" (IS 12 cl 11.1) | None — "designation shall not be changed through an amendment" | Standard + amendment both apply; ≤5 amendments per edition (SFM 8.4.4) |
| **Revised** (First/Second/… Revision) | Substantive update → new edition | Year changes; **number retained** (unless scope "substantially altered" → new number, old number frozen, IS 12 cl 5.1.2.2) | Old edition withdrawn on a stated date, often after a **concurrent-running window** |
| **Withdrawn** | Division Council decision on committee recommendation | — | Ceases to be valid on the gazette-notified withdrawal date |
| **Superseded** | A revised or new standard replaces it | — | Superseding standard may have same number, different number, or be a Part/Section of another IS; may amalgamate several standards into one |
| **Provisional Indian Standard** (Rule 27) | Urgent need, no wide circulation | Marked provisional | Valid ≤2 years, extendable ≤2 more; **cannot carry the Standard Mark**; lapses if not established as a regular IS |
| **Concurrent Running** (Rule 28) | DG allows two editions to coexist | Both editions listed "Active" | **Both editions legally valid** until a DG-set end date |
| **Reprint** | Demand-driven reprint, may fold in amendments | No change to designation or publication date | No lifecycle effect — "(First Reprint AUGUST 1984)", "IS …:1999 (Incorporating Amendments No. 1 and 2)" |

### 6.2 "What is the currently applicable version?" — the seven failure modes of "highest year wins"

Every one of these has a verified real example:

| # | Failure mode | Real example |
|---|---|---|
| **(a)** | An **old year is the current standard** | `IS 456 : 2000` (Reaffirmed 2021, Active, 6 amendments) — there is no newer IS 456. Also `IS 800 : 2007` (R2017), `IS 516 : 1959` (R2018, Active on BSB Edge) |
| **(b)** | The **newer year is a different Part**, not a newer edition | `IS 2062 : 2011` (Active) coexists with `IS 2062 : Part 1 : 2025` and `IS 2062 : Part 2 : 2026`. "Highest year" picks Part 2:2026 (quenched & tempered plates) — **wrong document** for general hot-rolled structural steel |
| **(c)** | **Two editions of the identical Part/Section are both "Active"** (concurrent running) | `IS/IEC 60947 : Part 5 : Sec 1 : 2024` and `… : 2016` are both Active; the 2016 edition's title carries "(Valid upto 12 September 2026)". Dedup on (number, part, sec) + max(year) silently drops a legally-valid edition. Legal basis: Rule 28 |
| **(d)** | A record is **simultaneously "withdrawn" and in force** | `IS 733 (Active,Concurrent Running) : 1983` — status "withdrawn", title "…(Valid up to 29 June 2026)", publication date 14 Jan 2026 |
| **(e)** | The **superseding standard has a LOWER IS number** | `IS 8112 : 2013` (OPC 43 grade) and `IS 12269 : 2013` (OPC 53 grade) were both **superseded by `IS 269 : 2015`** (which amalgamated 33/43/53-grade OPC). A spec citing "IS 8112" must resolve to a number 30× smaller |
| **(f)** | **Two official BIS sources contradict each other** | `IS 516 : 1959` — "withdrawn" in the services-portal CED 2 withdrawn list; "Active, (Reaffirmed 2018), 2 amendments" on BSB Edge. Same for `IS 3370 : Part 4 : 1967` |
| **(g)** | The **authoritative supersession value is unusable** | Verbatim "Superseded By" cells: `IS 3812:Part 1&Part 2 : 22003` (typo), `decided by council`, `IS 1786` (no year), `------`, `IS 13450(Part 2/Sec 19): 2018/ IEC 60601-2-19: 2009` (two designations slash-joined) |

### 6.3 How the engine should determine the current version

1. **Never infer obsolescence from age.** Validity ends only at withdrawal (BIS Act s.10(4)).
2. **Resolve the citation to a document identity** = `(series ∈ {IS, SP}, number, part?, section?, edition_year, language?)` — *not* `(number, year)`.
3. For a bare "IS N": enumerate all parts/sections/editions (prefix search), then **use the requirement's technical scope to pick the right part** — don't default to max(year).
4. **Follow supersession as a graph** allowing: same-number revision, number change, re-homing as a Part of another IS, and n→1 amalgamation. Parse titles for "Amalgamated revision of …".
5. Carry a nullable **`valid_until`** date sourced from the gazette withdrawal schedule (col. 5) / weekly-bulletin "Concurrent … (Till: dd-mm-yyyy)" / BSB Edge "(Valid upto …)".
6. Treat status as **multi-source with conflicts**: prefer Gazette > services-portal withdrawal table > BSB Edge, and **surface disagreements** rather than silently pick one.
7. Store the ISO/IEC counterpart edition year separately — it is often decades older than the IS year (`IS 8005 : 2024 (ISO 3569 : 1976)`).

### 6.4 How BIS communicates withdrawals — and how badly

| Channel | URL | Verdict |
|---|---|---|
| **Gazette of India** (the legal channel) | [egazette.gov.in/WriteReadData/2024/255168.pdf](https://egazette.gov.in/WriteReadData/2024/255168.pdf) (CG-DL-E-04072024-255168, 3 Jul 2024); index at [bis.gov.in/e-gazette-notification](https://www.bis.gov.in/e-gazette-notification/) | **Authoritative but not queryable.** Schedule columns: `Sl No. | Established | Date of establishment | To be withdrawn | Date of withdrawal`. Concurrent window is **per-standard** (3 months, 6 months…). eGazette *search* is an ASP.NET app with the session baked into the URL path — `SearchGazette.aspx` returns HTTP 500 without a live session. **Not scrapable.** |
| **Weekly Standards Bulletin** | [services.bis.gov.in/php/BIS_2.0/dgdashboard/weekly-bulletin-list](https://services.bis.gov.in/php/BIS_2.0/dgdashboard/weekly-bulletin-list) — 306 weekly PDFs, fixed ToC (New / Revised / Amendments / Withdrawn / Meetings) | **Not a usable withdrawal feed.** Across ~30 issues sampled 2023→Sep 2026, the "Standards Withdrawn" and "Amendments Published" sections **always** read "No standards were withdrawn in this week". The "Standards Revised" table *does* encode concurrency inline: `IS 12634 : 2025 / Concurrent : IS 12634 : 1989 (Till : 22-11-2025)`. Post-Aug-2026 issues are empty ("No Data Found") |
| **Per-committee portal withdrawal table** | `services.bis.gov.in/.../all_withdrawn_stndrd_commtt?commttid=<b64>&commttname=<b64>` | **Best structured withdrawal source found.** Public, no login. Columns `S.No. | IS Number | IS Title | Category | Superseded By`. Requires iterating base64 committee ids |
| **BSB Edge withdrawn list** | [standardsbis.bsbedge.com/BIS_Withdrawn.aspx](https://standardsbis.bsbedge.com/BIS_Withdrawn.aspx) | 25/page, no bulk export without login. **Contradicts the services portal** on some records |

**No machine-readable (CSV/JSON) master withdrawal list was found on any BIS domain.** UNVERIFIED whether one exists behind login.

### 6.5 Amendments — semantics (verified from IS 12 : 2005)

- Numbered **sequentially from "1" per edition** (reset on revision). Header format: `AMENDMENT NO. 5 OCTOBER 1999 TO IS 12269:1987 …`.
- Instruction-style: "(Page 2, clause 4.1) — Insert the following new clause after 4.1…".
- **An amendment can never change the IS number** (cl 11.1). Subsequent clauses are **not renumbered** on insertion/deletion (cl 11.2.4).
- Amendments fold into the next **revision** (implicitly) and into **reprints** explicitly ("Incorporating Amendments No. 1 and 2").
- **Amendments themselves can be withdrawn** (`SP 6 : Part 7 Amd. 1 : 2008` — status withdrawn on BSB Edge).
- **Amendment year ≠ publication date** (`IS 2 Amd. 1 : 2023` published 18 Jan 2024).
- **An amendment can break IS/ISO dual-number identity** (cl 16) — if the amended IS is no longer identical to the ISO/IEC standard, it loses the dual number.
- **Data inconsistency to expect:** `IS 456 : 2000` title says "(Including Amendment 1, 2, 3, & 4)" while the count field says "No. of Amendments : 6".

### 6.6 Part / Section numbering

- All parts of an IS share the **same number** (IS 12 cl 5.2.1). A Section is a separately-published portion of a Part: `IS 302 (Part 2/Sec 13) : 1994`.
- **"Section" is ambiguous** — it can mean a separately published document *or* a purely internal subdivision (IS 12 cl 5.2.2.3).
- Parts of one standard routinely carry **different years and different statuses**:
  - `IS 1893` — un-parted `1984` (Reaffirmed 2022) *still listed* alongside `Part 1 : 2016`, `Part 2 : 2014`, `Part 4 : 2024`. **No Part 5 exists.**
  - `IS 8000` — `Part 1 : 2019`, `Part 2 : 2024`, `Part 3 : 2023`, `Part 4 : 1976` (Reaffirmed 2016) — a 1976 part beside a 2024 part, all Active.
  - `IS 13311` — `Part 1 : 1992` **withdrawn** (→ `IS 516 (Part-5/Sec-1) : 2018`); **`Part 2 : 1992` still Active**. Same number, same year, opposite status.
  - `IS 516` — **13 live documents** under one number spanning 1959–2022.

### 6.7 Dual numbering (IS/ISO, IS/IEC, IS/ISO/IEC)

- Governed by SFM 8.3 (under Rule 29) and IS 12 (Parts 2 & 3) = India's adoptions of ISO/IEC Guide 21-1 / 21-2.
- Dual number = IS number + year **and** ISO/IEC number + *its* year. Special cases (ISO 9000, ISO 14000 families) use `IS/ISO 9001 : 2015`.
- **Degree of equivalence** (IDT / MOD / NEQ per ISO/IEC Guide 21) is carried:
  - inline in the designation: `IS 8007 : Part 1 : 2024 ( ISO 1726-1 : 2000, MOD)`
  - as a portal column literally headed "Degree of Equivalence" (value vocabulary UNVERIFIED — endpoint blocked)
- Formatting is wildly inconsistent (`-1` vs `: Part 1`, spacing, repeated "IS" prefix in the ISO field).
- **Commercial split:** indigenous IS are ₹0 (login to download); ISO/IEC adoptions are **priced**.

---

## 7. Certification & QCO

*(Thread complete.)*

### 7.1 What makes a standard MANDATORY

The legal hook is **BIS Act 2016 §16** (power to notify compulsory use) read with **§25** (prohibition on manufacture/import/sale without the Standard Mark). **A standard is mandatory if and only if a ministry has issued a Quality Control Order (QCO) naming it.** Nothing intrinsic to the standard says so.

Headline numbers (PIB / Lok Sabha written reply, Ministry of Consumer Affairs, **12 March 2025**, [PRID 2110935](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2110935)):
- **187 QCOs** covering **769 products** notified for compulsory BIS certification
- **22,689 Indian Standards in force**; 10,300 have ISO/IEC counterparts; 9,616 (93.3%) harmonised

### 7.2 The four HTML tables that are the entire machine-readable regulatory surface

| Table | URL | Rows | Columns | Key gotcha |
|---|---|---|---|---|
| **Scheme I** (ISI mark) | [.../scheme-i-mark-scheme/?lang=en](https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en) | 908 `<tr>` — **639 numbered products**, 182 category headers, 190 notification cells | `Sr No. | IS No. | Product | Notification link` | **`rowspan` forward-fill** — the Steel QCO cell has `rowspan="151"`; a naive parser drops the QCO for 150 of 151 standards. **No enforcement-date column** — dates are free prose inside the notification cell |
| **Scheme II / CRS** (registration) | [.../scheme-ii-registration-scheme/?lang=en](https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-ii-registration-scheme/?lang=en) | 4 tables, **74 products** (65 electronics + 5 solar + 3 chemicals + 1 textile) | `Sl. No. | IS No. | Title | Product Category | Notification` | Dirty IS numbers — `10322 (Part 5/Sec 1)` with **no "IS " prefix** |
| **Scheme X** (self-declaration for specified machinery/electrical) | [.../products-under-compulsory-certification-scheme-x/?lang=en](https://www.bis.gov.in/products-under-compulsory-certification-scheme-x/?lang=en) | 32 | `Sr No. | Indian Standards | Title | Product category | Specific Requirement | Notification` | **`Specific Requirement` column** — compulsory status is conditioned on *rating/category* (e.g. "AC circuit-breakers Category A up to 630 A"), not on the IS number alone. `Sr No.` is a hierarchical string (`1.1(a)`) |
| **Scheme IV** (conformity certificate) | [.../scheme-4/?lang=en](https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-4/?lang=en) | 2 | `Sr No. | Product | Essential Requirement | QCOs` | **Component-level obligations** flowing through a finished product (e.g. transformer cores must be made from ISI-marked CRGO steel) |
| **Upcoming QCOs** | [bis.gov.in/upcoming-qcos-notified-and-due-for-implementation/?lang=en](https://www.bis.gov.in/upcoming-qcos-notified-and-due-for-implementation/?lang=en) | **118** | `Sr. No. | Ministry/Department | Product | Indian Standard | Enforcement date` | **The ONLY BIS source with an explicit enforcement-date column.** Range Sep 2026 → Jun 2027 |

### 7.3 The two "horizontal" QCOs that no IS-number lookup can capture

- **Safety of Household, Commercial and Similar Electrical Appliances (QCO), 2024** (DPIIT) — sweeps in *any* appliance ≤250 V single-phase / 415 V three-phase not already covered by another QCO.
- **Machinery and Electrical Equipment Safety (Omnibus Technical Regulation) Order, 2024** (Ministry of Heavy Industries), notified 28 Aug 2024, gazette PDF [heavyindustries.gov.in/.../otr_gazette_notification.pdf](https://heavyindustries.gov.in/sites/default/files/2024-09/otr_gazette_notification.pdf) — 20 categories of machinery/electrical equipment + sub-assemblies. Effective 28 Aug 2025 (later deferred; UNVERIFIED reports of 1 Sep 2026).

These confer mandatory status **by scope description, not by IS number** — the engine must flag any product matching their scope predicates for **human review**.

### 7.4 The derivable "mandatory" label

```
MANDATORY   : IS number ∈ {Scheme I ∪ II ∪ IV ∪ X tables}
              → carry QCO title, S.O. number(s), date(s), gazette PDF URL, scheme
UPCOMING    : IS number ∈ upcoming-QCO table
              → carry issuing ministry + explicit enforcement date
RELEVANT    : IS number resolves via searchKnowStandards / getData.php but appears in none of the above
HORIZONTAL  : product scope matches a horizontal-QCO predicate → route to human review
```

### 7.5 CRS portal — `www.crsbis.in/BIS/`

- 403 to `curl` (any UA); loads in a real browser.
- **Verified public JSON endpoints** (no login, no token) — but **aggregate counts only**:
  - `GET https://www.crsbis.in/BIS/publicdashAction.do?hmode=getTilesDataMonthly&yearMonth=202609` → `["2280","704","511","14","29190","26987","2955","61","44","508"]` (bare positional array, no keys)
  - `GET https://www.crsbis.in/BIS/dgAction.do?hmode=getInprocessCount` → `["73"]`
  - Dashboard (2026-09-10): 26,987 operative licences, 73 product categories, 44 standards covered
- **Public licensee search** (`POST /BIS/Lims_registrationc.do?hmode=getLimsData`, base64-encoded params) — **returned ZERO rows for every query attempted** (product category, brand, registration number), via both `fetch` and the real form UI, despite the dashboard claiming 26,987 operative licences. **The public CRS registration search is currently non-functional. Do not plan on it.**

### 7.6 FMCS (Foreign Manufacturers) licensee data — the best machine-readable find

`GET https://www.services.bis.gov.in/php/BIS_2.0/fmcs/All_fmcs_list.php` — **HTTP 200, 2.0 MB, no auth, no CAPTCHA**. One HTML table, **~3,160 rows**. Columns: `S No | CML No | Name & Address | Validity Date | Standard No | Status | Variety/Brand Names`. 424 distinct IS numbers; 2,719 Operative + 414 Deferred. Real row: `4006840 | Crown Cement PLC … | 31-JUL-27 | IS 269 : 2015 | Operative | Ordinary Portland Cement - 53 & 43 Grade`.

**Domestic ISI licensees are NOT publicly bulk-available** — `bis.gov.in/branch_important_lin/list-of-isi-mark-licences/` has no actual list; domestic verification is one-at-a-time through ManakOnline behind a **CAPTCHA**.

### 7.7 Hallmarking / HUID

- Mandatory in **392 districts** across 8 phases (Phase 1: 23 Jun 2021 → Phase 8: 3 Aug 2026). Full district list: [bis.gov.in/.../Phase-wise-coverage-of-districts-under-gold-mandatory-hallmarking.pdf](https://www.bis.gov.in/wp-content/uploads/2026/09/Phase-wise-coverage-of-districts-under-gold-mandatory-hallmarking.pdf). Standards: IS 1417 (gold), IS 2112 (silver).
- **AHC list** ([huid.manakonline.in/MANAK/AHCListForWebsite](https://huid.manakonline.in/MANAK/AHCListForWebsite)) — 1,659 Assaying & Hallmarking Centres, no login, freely bulk-downloadable. **Contains personal contact names, phone numbers and emails** — handle with care.
- **Jeweller lists** (`ApplicationHMLicenceRelatedrpt1?isno=1417`) require State + District + IS selection **and a CAPTCHA** — hard blocker for bulk data.

### 7.8 Worked certification examples

**(a) Electronics under CRS — power adapters, `IS 13252` → `IS/IEC 62368-1` (fully verified from the gazette itself)**
[PDF: Migration to IS/IEC 62368-1:2023](https://www.bis.gov.in/wp-content/uploads/2025/11/Migration-to-IS-IEC-62368-Part-1-2023-from-IS-13252-Part-1-2010-and-IS-616-2017.pdf)
- Gazette of India Extraordinary, No. 4842, **4 November 2025**; Gazette ID **CG-DL-E-07112025-267449**
- **MeitY** notification dated **29 October 2025**, **S.O. 4997(E)**, under **BIS Act 2016 s.16(1) & (2) r/w s.25(3)**
- Parent order: "Electronics and Information Technology Goods (Requirement of Compulsory Registration) Order, 2021", **S.O. 1248(E), 18 March 2021**
- Full amendment chain of the parent (quoted in the notification's own footnote): S.O. 1353(E) 25 Mar 2021; 2844(E) 1 Jul 2021; 1929(E) 26 Apr 2023; 1652(E) 9 Apr 2024; 4378(E) 9 Oct 2024; 1363(E) 20 Mar 2025; 4362(E) 22 Sep 2025
- Effect: `IS 13252 Part 1:2010` and `IS 616:2017` superseded by `IS/IEC 62368-1:2023`; new Schedule entry **Sl. No. 65 = Extended Reality (AR/VR/MR)**
- **Two concurrent-running deadlines in one notification:** 1 May 2026 for Sl. No. 65; 1 November 2028 for all other items

**(b) LED luminaires — `IS 10322` (CRS)**
Scheme II rows 22, 32–37, 46 map to `IS 10322` Part 5 Sections 1, 2, 3, 5, 6, 7, 8, 9. Original CRS gazette: **S.O. 2905(E), 7 November 2014**; all superseded by CRO 2021.

**(c) Steel — Ministry of Steel QCO**
"Steel and Steel Products (Quality Control) Order, 2020" — **S.O. 756(E), 14-02-2020** → superseded by S.O. 1673(E) 27-05-2020 → S.O. 2379(E) 17-07-2020 → S.O. 4082(E) 12-11-2020 → S.O. 4637(E) 22-12-2020. [QCO PDF](https://bis.gov.in/wp-content/uploads/2020/03/Steel-QCO-14022020-1.pdf). **One QCO → 151 IS numbers**, with per-IS enforcement dates expressed only as English prose. Covers `IS 277:2003`, `IS 1786:2008`, `IS 2062:2011`.

**(d) Cement — `IS 269` / `IS 1489`, and a trap for the recommender**
"Cement (Quality Control) Order, 2003" — **S.O. 191(E), 17 Feb 2003** ([PDF](https://www.bis.gov.in/MandatoryProducts/QCOrder/SO-No-191(E).pdf)), `rowspan="16"` covering `IS 12330, 12600, 1489 (Part 1), 1489 (Part 2), 269, 3466, 455, 6452, 6909, 8041, 8042, 8043, 8229, 16415:2015, 16993:2018`.
**TRAP (verified):** `IS 8112` and `IS 12269` appear **nowhere** in the Scheme I list, yet both still exist as live catalogue entries. The mandatory obligation moved when `IS 269:2015` consolidated 33/43/53-grade OPC — confirmed independently by FMCS licensee data (Crown Cement holds `IS 269 : 2015`, "OPC 53 & 43 Grade"). **A tender saying "cement conforming to IS 8112" cites a standard that is not itself under any QCO.** A naive string-match recommender reports "not mandatory" and is badly wrong.

**(e) Helmets — two separate QCOs, two ministries, split by use case**
- `IS 4151:2015` → "Helmet for riders of Two Wheeler Motor Vehicles (QCO), 2020", **S.O. 4252(E), 26-11-2020**
- `IS 2745:1983`, `IS 2925:1984` (industrial safety helmets) → "Helmet for Police Force, Civil Defence and Personal Protection (QCO), 2023", **S.O. 4649(E), 23 Oct 2023**

### 7.9 The six certification-data traps (all verified)

1. **`rowspan` forward-fill** — miss it and 150/151 steel standards lose their QCO.
2. **Superseded/consolidated standards** — `IS 8112`/`IS 12269` are live catalogue entries under no QCO; the obligation sits on `IS 269:2015`. Needs a supersession graph.
3. **Horizontal/omnibus QCOs** — mandatory by scope description, not IS number. No lookup table expresses them.
4. **Rating- and clause-conditional mandates** — Scheme X ties compulsion to rating/category and excludes specific test clauses. Scheme IV ties it to a component inside a finished product.
5. **Concurrent-running windows** — S.O. 4997(E) alone carries two cut-off dates (1 May 2026, 1 Nov 2028). During the window **both** standards are valid — a binary flag is wrong.
6. **Dirty IS-number strings** — normalise through `getData.php` before matching.

---

## 8. Government Procurement Context

*(Thread complete.)*

### 8.1 The legal chain: GFR 2017 → Manual for Procurement of Goods 2024 → DoE OM

**GFR 2017 never says "BIS."** The standards obligation in the *General Financial Rules, 2017* (Chapter 6, [doe.gov.in/files/inline-documents/GFR2017.pdf](https://doe.gov.in/files/inline-documents/GFR2017.pdf)) is generic:

| Rule | What it says (verbatim / near-verbatim) | Relevance to the engine |
|---|---|---|
| **Rule 144(i)(a)** | Description of the procurement "should be **objective, functional, generic and measurable** and specify technical, qualitative and performance characteristics" | "performance not design" principle — the engine should recommend standards, not designs |
| **Rule 144(i)(b)** | "**not indicate a requirement for a particular trade mark, trade name or brand**" | the engine's "gaps" check flags brand names in a draft spec |
| **Rule 144(iii)** | Technical specs "shall, to the extent practicable, be **based on the national technical regulations or recognized national standards or building codes, wherever such standards exist**, and in their absence, be based on the relevant international standards. *Provided that a procuring entity may, for reasons to be recorded in writing, adopt any other technical specification.*" | **This is the core hook.** "national technical regulations" = QCOs; "recognized national standards" = Indian Standards. The proviso = the deviation path the engine must warn about |
| **Rule 173(i)(a)** | The bidding document "should contain … **Description and Specifications of goods**" | where the recommended standards land in the tender |
| **Rule 173(ix)** | "**The specifications … should be clearly stated without any ambiguity … the specification should be broad based to the extent feasible**" | over-restrictive / tailor-made spec risk |

> **Correction to a common assumption:** GFR **Rules 177–178 are consultancy-services rules, not goods-specification rules.** The specifications content is concentrated in **Rule 144** and **Rule 173**. Sub-clause numbers in Rule 173 beyond (xi) come from post-2017 amendments — treat exact high sub-clause numbers as version-dependent.

**The BIS preference lives one level down**, in the **Manual for Procurement of Goods, Second Edition, 2024** (Department of Expenditure, issued 22 July 2024 — confirmed current; [landing page](https://doe.gov.in/circulars/manual-procurement-goods-second-edition-2024)):

| Para | What it says | 
|---|---|
| **Para 1.14** | Brand/trade names "should be avoided as far as possible. Where unavoidable, such item descriptions should always be followed by the words **'or substantially equivalent.'**" |
| **Para 2.2.1(4)** | "Normally, these standards should be based on national technical regulations or **recognised national standards (Bureau of Indian Standards – BIS)** or building codes, wherever such standards exist. **Preference should be given to procure the goods which carry the BIS mark.** … *Provided that an indenting authority may, for reasons to be recorded in writing, base the TS on equivalent international standards even in cases where BIS standards exist.* For any deviations from Indian standards … specific reasons … should be duly recorded with the approval of the CA [Competent Authority]." |
| **Para 2.2.2(4)** | Essential technical particulars to specify in the tender include: "**Requirement of the BIS mark, where applicable, mentioning all parameters where such a specification provides options**" |
| **Para 2.2.2** (others) | Also: scope & end use (1); material composition, dimensions, tolerances, workmanship, **test schedule** (2); **inspection procedure and criteria of conformity** (7); **type test certificate / type approval for statutory compliance** (8) — all of which map to *allied / test-method / safety* standards the engine should surface |
| **Para 2.4** | Recognises **tailor-made specifications as an audit risk** — the "specification QA review" step the engine supports |
| **Footnote 41 / DoE OM F.N.12/17/2019-PPD dated 12.05.2020** | "**wherever Indian Technical specifications and Quality Certifications exist, the procuring entity should prescribe them.** In those rare … cases where … the procuring entity intends to specify foreign Technical Certifications … it must record its reasons in writing … subject to … audit." |

### 8.2 PPP-MII (Preference to Make in India) interaction

DPIIT Order **P-45021/2/2017-PP (B.E.-II)**, 15.06.2017 as amended (consolidated in the 2024 Manual, Chapter 1). Local-content class (Class-I ≥50%, Class-II 20–50%, Non-local <20%) is a **separate gate** from technical/standards responsiveness — a bid must *first* be technically responsive to the IS/QCO/BIS-mark requirement, *then* local content determines purchase preference. **PPP-MII para 9 ("Specifications in Tenders")** forbids using foreign certifications / non-Indian standards as a backdoor to exclude local suppliers — foreign certification only with **Secretary-level written approval** and only where an Indian Standard is unavailable. → **direct engine hook: flag when a draft spec cites a foreign/ISO standard while an equivalent IS exists.**

### 8.3 GeM

**No public, machine-readable "GeM category → IS number" mapping exists.** GeM categories carry structured "golden parameters" (mandatory technical attributes) with standards references embedded per-category rather than as one typed field (UNVERIFIED whether every category exposes a dedicated IS-number field — live category pages not inspected). For categories under mandatory ISI/CRS, a valid BIS licence / R-number is **required to list** and GeM validates it against the BIS database; holding one also **exempts** the seller from GeM Vendor Assessment for that category. GeM's Quality Assurance Framework ties catalogue checks and lab testing to the applicable IS. **This mapping gap is itself an opportunity the SIH engine addresses** (category text / golden parameters → candidate IS list).

### 8.4 The workflow and where the engine plugs in

```
Need assessment (Manual Ch. 2; Annual Procurement Plan, GFR 144(x))
  → Draft technical specification / ToR (GFR 144(i), Manual 2.2.1)
    → ★ Standards identification    ← ENGINE: find the IS / national technical regulation
      → ★ Standards validation      ← ENGINE: current? superseded? which amendment? correct part?
        → ★ Regulatory-status validation ← ENGINE: QCO / CRS / mandatory ISI mark? → decides clause wording
          → ★ PPP-MII / foreign-cert check (Manual para 9) ← ENGINE: IS-exists-but-foreign-standard-cited warning
            → Spec finalised → Competent Authority approval (reasons recorded for any deviation — audit-exposed)
              → Tender / GeM bid published (GFR 173(i))
                → ★ Bid evaluation ← ENGINE (secondary): check bidder's declared standard / BIS licence / test certs vs the spec
```

**Primary insertion point: between a drafted spec and Competent-Authority sign-off.** Secondary: pre-tender audit/QA review of an existing draft (Manual para 2.4).

### 8.5 What a procurement officer actually needs from the system (concrete output spec)

1. **A ranked shortlist** of candidate Indian Standards (IS number + full title + year/revision) with a **confidence score** — not a single guess.
2. **Current version/status of each** — "in force" / "superseded by IS xxxx:yyyy" / "amendment No. n applicable" — because **citing a withdrawn IS in a tender is an audit finding**.
3. **A mandatory-vs-voluntary flag per standard**, because it changes the clause wording: *"shall bear the Standard Mark of BIS under licence"* (mandatory — QCO/CRS) vs *"shall conform to IS xxxx or equivalent"* (voluntary benchmark). Surface the **QCO name + gazette notification number + effective date**.
4. **Evidence excerpts / citations** — which sentences of the input spec triggered which IS (scope-clause match) — so the officer can defend the choice in file notings and to audit. **Traceability, not a black box.**
5. **A "gaps in your spec" warning:** parameters the matched IS covers that the draft omits; brand names violating GFR 144(i)(b); a foreign/ISO standard cited where an equivalent IS exists (PPP-MII para 9 risk); non-metric units.
6. **Draft tender language** — ready-to-paste specification + eligibility clauses referencing the chosen IS + certification requirement.
7. Optional: **ICS code(s)** and the **IS ⇄ ISO/IEC equivalence** statement.

**The Rule 24 anchor still holds:** an Indian Standard is voluntary *by default* and becomes binding when (a) a contract stipulates it, (b) legislation refers to it, or (c) a QCO makes it mandatory. The engine's mandatory/voluntary flag is a direct encoding of this.

---

## 9. Data Sources

Consolidated inventory of every source touched, with what it contains.

| # | Source | Contains | Domain |
|---|---|---|---|
| 1 | Scheme I HTML table | 639 products ↔ IS numbers ↔ QCO notifications, 531 gazette PDF links | Regulatory |
| 2 | Scheme II / CRS HTML table | 74 products ↔ IS numbers ↔ CRS notifications | Regulatory |
| 3 | Scheme X HTML table | 32 rows with rating/category conditions | Regulatory |
| 4 | Scheme IV HTML table | 2 component-level obligations | Regulatory |
| 5 | Upcoming QCOs HTML table | 118 rows **with enforcement dates + issuing ministry** | Regulatory |
| 6a | **`getWebsiteIndianStandardsList`** (new portal) | **JSON: whole catalogue, 24,145 records**, paginated, unauth | Catalogue |
| 6b | **`getWebsiteStandardDetails` / `getCrossRefDetails` / `getAmendmentDetails`** (new portal) | JSON: per-standard metadata, **forward + reverse cross-refs**, amendments + PDF keys | Catalogue + graph |
| 6c | **`getwebsiteAllSectionalCommittees` / `fetchDepartmentList`** (new portal) | JSON: 415 committees, departments + scope text | Structure |
| 6 | `getData.php` (legacy) | JSON: partial IS number → canonical designation + year | Catalogue |
| 7 | `getVariety.php` (legacy) | Per-licence scope text | Conformity |
| 8 | `All_fmcs_list.php` | 3,160 foreign-manufacturer licences (IS number, status, validity) | Conformity |
| 9 | `all_reaff_stndrd_commtt` | Per-committee reaffirmation lists | Lifecycle |
| 10 | `all_withdrawn_stndrd_commtt` | Per-committee withdrawal lists + "Superseded By" | Lifecycle |
| 11 | `dep_commtt` | Technical-department roll-ups | Structure |
| 12 | BSB Edge `BIS_SearchStandard.aspx` | Prefix search → designation, status, TC, reaffirmation, price, ISO/IEC counterpart | Catalogue |
| 13 | BSB Edge `BIS_Withdrawn.aspx` | Withdrawn list, 25/page | Lifecycle |
| 14 | BSB Edge `BIS_FreeAmendments.aspx` | Amendments as catalogue rows | Lifecycle |
| 15 | Weekly Standards Bulletin PDFs | New/Revised (with concurrency dates); Withdrawn section empty | Lifecycle |
| 16 | Gazette of India (BIS notifications) | Legally authoritative establish/withdraw schedules | Lifecycle |
| 17 | QCO gazette PDFs (~531) | Full QCO text, S.O. numbers, enforcement dates, IS lists | Regulatory |
| 18 | PIB / Lok Sabha replies | Headline counts, policy statements | Context |
| 19 | HUID `AHCListForWebsite` | 1,659 hallmarking centres | Conformity |
| 20 | Hallmarking phase-wise district PDF | 392 districts × 8 phases | Regulatory |
| 21 | `law.resource.org/pub/in/bis/` + `archive.org` (`gov.in.is.<n>.<y>`) | Full PDF + OCR TXT of many standards; **frozen ~2018** — no post-2018 revisions/amendments | Document text |
| 22 | BIS "SMART" XML-conversion RFP (`ITSD_Tender_document_20240320.pdf`) | Evidence of a forthcoming NISO-STS tagged-XML feed; **not public yet** | Future feed |
| 23 | data.gov.in / NDAP | **No BIS dataset exists** (only "Indian Bureau of *Mines*") | Open data — negative finding |

---

## 10. Data Accessibility

| Source | Contains | Public? | Login? | Structured? | Downloadable? | Queryable? | API? | Usable for SIH? | Licence | Change freq. |
|---|---|---|---|---|---|---|---|---|---|---|
| Scheme I table | product↔IS↔QCO | Yes | No | Semi (HTML table) | Yes (scrape) | No (static page) | No | **Yes — core** | Gov content (freely usable) | Rarely (new QCOs) |
| Scheme II / CRS table | 74 products | Yes | No | Semi | Yes | No | No | **Yes — core** | Gov content | Rarely |
| Scheme X table | 32 rating-conditional rows | Yes | No | Semi | Yes | No | No | **Yes** | Gov content | Rarely |
| Upcoming QCOs table | 118 rows + dates | Yes | No | Semi | Yes | No | No | **Yes — dates!** | Gov content | Monthly-ish |
| `getData.php` | IS number → designation | Yes | No | **JSON** | Yes | **Yes (`?tag=`)** | Undocumented internal | **Yes — critical** | None found | With catalogue |
| `All_fmcs_list.php` | 3,160 foreign licences | Yes | No | Semi (HTML) | Yes | No | No | **Yes** | None found | Weekly-ish |
| `all_withdrawn_stndrd_commtt` | withdrawal + superseded-by | Yes | No | Semi | Yes | Per-committee (`?commttid=`) | Undocumented internal | **Yes** | None found | Continuous |
| `all_reaff_stndrd_commtt` | reaffirmation years | Yes | No | Semi | Yes | Per-committee | Undocumented internal | **Yes** | None found | Continuous |
| **`getWebsiteIndianStandardsList`** (new portal) | **whole catalogue, 24,145 records** | Yes | **No** | **JSON** | Yes (242 paged calls) | **Yes** (`page`/`pageSize`/`search`) | **Undocumented, unauth, CORS `*`** | **Yes — the backbone** | none published | Continuous |
| **`getWebsiteStandardDetails`** (new portal) | per-standard full metadata | Yes | No | **JSON** | Yes | Yes (`encId`) | Undocumented, unauth | **Yes** | none published | Continuous |
| **`getCrossRefDetails`** (new portal) | **forward + reverse cross-refs** | Yes | No | **JSON** | Yes | Yes (`encId`) | Undocumented, unauth | **Yes — the graph** | none published | Continuous |
| **`getAmendmentDetails`** (new portal) | amendments + PDF keys | Yes | No | **JSON** | Yes | Yes (`encId`) | Undocumented, unauth | **Yes** | none published | Continuous |
| **`getwebsiteAllSectionalCommittees`** (new portal) | 415 committees + numeric ids | Yes | No | **JSON** | Yes | `{}` | Undocumented, unauth | **Yes** | none published | Rarely |
| BSB Edge search | designation, status, **price**, ISO counterpart | Yes (browse) | **Yes (download)** | Semi | Metadata only w/o login | Prefix search (`&id=0` required); **no paging** | No | Price column only | Copyrighted catalogue | Continuous |
| Weekly Bulletin PDFs | new/revised + concurrency dates | Yes | No | PDF | Yes | No | No | Partial (Withdrawn section empty) | Gov content | Weekly (empty after Aug 2026) |
| Gazette of India | authoritative lifecycle | Yes | No | PDF | Yes (if you have the URL) | **No** (search returns HTTP 500) | No | Hard — not scrapable | Gov work | Continuous |
| QCO gazette PDFs | full QCO text | Yes | No | **Unstructured PDF** | Yes | No | No | Yes with OCR/LLM extraction | Gov work (freely usable) | Rarely |
| CRS dashboard JSON | aggregate counts only | Yes | No | JSON (positional array) | Yes | `?yearMonth=` | Undocumented internal | **No — no per-standard data** | None found | Monthly |
| CRS licensee search | (intended) registrations | Yes | No | — | — | Yes (but returns 0 rows) | Undocumented internal | **No — non-functional** | — | — |
| ManakOnline domestic ISI / jeweller lists | domestic licences | Yes | No | — | No | **CAPTCHA-gated** | No | **No — CAPTCHA** | — | Continuous |
| HUID AHC list | 1,659 centres + PII | Yes | No | Semi (HTML) | Yes | No | No | Yes (but has PII) | — | Continuous |
| `law.resource.org/pub/in/bis/` | full-text standards, **frozen ~2018** | Yes | No | PDF + OCR TXT | Yes | Directory browse (by committee) | No | **Yes — free full text, pre-2018 only** | contested; BIS copyright asserted | Static mirror |
| data.gov.in / NDAP | — | Yes | API key for API | — | — | Yes (generic) | Yes (generic) | **No — no BIS dataset exists** | Gov Open Data Licence – India | — |
| eGazette search | all gazette notifications | Yes | Session-in-URL | — | Per-PDF | **HTTP 500 without live session** | No | **No — not scrapable** | Gov work | Continuous |

---

## 11. Machine-Readable Data

**No *documented* public API was found**, and **`data.gov.in` / NDAP host no verified BIS dataset** (catalog API probes returned 404/empty; `site:data.gov.in "Bureau of Indian Standards"` surfaces only *Indian Bureau of Mines* — a different agency). `api.data.gov.in` is not needed.

**But an undocumented, unauthenticated JSON API does exist** — the Laravel/Lumen backend of the new Angular portal. Verified 2026-09-10 with plain `curl`, no credentials:

| Endpoint (`POST https://standardsadmin.bis.gov.in/…`) | Format | Content |
|---|---|---|
| `proposal-service/getWebsiteIndianStandardsList` | JSON, paginated (`pageSize` ≤ 100) | **Whole catalogue — 24,145 records.** 242 requests. |
| `review-service/searchKnowStandards` | JSON | IS number → encId + status/withdrawal |
| `review-service/getWebsiteStandardDetails` | JSON | full per-standard metadata (§4.1) |
| `review-service/getCrossRefDetails` | JSON | **forward + reverse cross-reference graph** (§5) |
| `review-service/getAmendmentDetails` | JSON | amendments + PDF keys |
| `review-service/getGazettedetails` | JSON | S.O. number + gazette PDF key (regulated standards) |
| `technical-committee/getwebsiteAllSectionalCommittees` | JSON | 415 committees + numeric ids |
| `master-service/fetchDepartmentList` / `getSector` / `getSubsector` | JSON | departments (+ scope text) / sectors |

Plus, on the **legacy** host (`services.bis.gov.in`), still live: `fmcs/getData.php?tag=` (clean JSON designation resolver), `fmcs/All_fmcs_list.php` (3,160-row licensee HTML), the per-committee `all_reaff_stndrd_commtt` / `all_withdrawn_stndrd_commtt` / `all_revised_stndrd_commtt` DataTables (`commttid = base64(committeeId)`), and `isdetails_mnd/<pk_is_id>` (login-free detail page). And on `crsbis.in`, `publicdashAction.do?hmode=getTilesDataMonthly` (JSON, **aggregate counts only**).

**Caveats — treat as scraping, not an API:**
- **Undocumented, unversioned, no terms of use, no stability guarantee.** Expect breakage; pin to observed field names; snapshot every pull with `scraped_at`.
- It is a **government host** — be polite (~1–2 req/s), even though no rate limiting was observed.
- The Excel bulk-export routes *are* permission-checked — the open path is the JSON pagination.
- Licensee / CRS / MCS detail endpoints exist but return **empty unauthenticated** — that data still comes from §7's HTML tables and the FMCS list.

**BIS SMART / machine-readable standards initiative:** BIS is running **"SMART — Standards Machine Applicable, Readable and Transferable"** and has issued an RFP, **"Engagement of an Agency for XML Conversion of Indian Standards"** ([ITSD_Tender_document_20240320.pdf](https://www.bis.gov.in/wp-content/uploads/2024/03/ITSD_Tender_document_20240320.pdf), 2024-03-20), requiring an **XSD conforming to NISO STS** (Standards Tag Suite). A future official tagged-XML feed is plausible but **not public as of 2026-09-10**. **Design the ingestion layer so the HTML/JSON scrape can be swapped for NISO-STS XML later.**

---

## 12. Copyright / Licensing Risks

*(Thread complete.)*

### 12.1 The statute

- **BIS Act 2016, s.10(5):** "Notwithstanding anything contained in any other law, **the copyright in an Indian Standard or any other publication of the Bureau shall vest in the Bureau.**"
- **BIS Act 2016, s.11(1):** "**No individual shall, without the authorisation of the Bureau, in any manner or form, publish, reproduce or record any Indian Standard or part thereof**, or any other publication of the Bureau." s.11(2) bars issuing anything that impersonates an Indian Standard. **The only carve-out: "nothing … shall prevent any individual from making a copy of Indian Standard for his personal use."**
- **BIS Act 2016, s.29(1):** contravening s.11 is **punishable with a fine up to ₹5,00,000** — a statutory offence *on top of* civil infringement under the Copyright Act 1957. Offences are compoundable (s.33) and cognizable only on a BIS complaint (s.32).
- **There is no fair-dealing / research exception in the BIS Act itself.** (Copyright Act 1957 s.52(1)(a) fair dealing exists but does not neutralise the separate s.11 offence.)

### 12.2 BIS's own terms

- BIS copyright page ([bis.gov.in/copyright/](https://www.bis.gov.in/copyright/)) carries **"FORM-A: Request for Reproducing Extracts from Indian Standards"** — even reproducing *extracts* in another document requires prior written permission from the Head (Publication & Sales). *(Exact verbatim text UNVERIFIED — the page served as a binary blob; the requirement is clear from the form's existence.)*
- Every IS PDF carries "© BIS [year] — All rights reserved … no part … may be reproduced or utilized in any form … without prior permission in writing." *(Standard boilerplate; exact wording UNVERIFIED this pass.)*
- **Catalogue metadata** (IS number, title, ICS, pages, price, reaffirmation year, equivalence, QCO coverage) is displayed openly for browsing. **BIS publishes no data licence and no API terms-of-use granting reuse** — the operative distinction is **facts vs. expression**, not an express BIS grant.

### 12.3 The Public.Resource.Org case — there is NO Indian precedent

- **The mirror:** [law.resource.org/pub/in/bis/](https://law.resource.org/pub/in/bis/) — "Public Safety Standards of the Republic of India", ~19,000 Indian Standards posted by Public.Resource.Org (Carl Malamud). Asserted basis: standards incorporated into law are "the law"; Copyright Act s.52(1)(q)(i) (Gazette matter); RTI Act s.4. Comparative anchors: US *Georgia v. Public.Resource.Org* (2020), *ASTM v. Public.Resource.Org* (D.C. Cir. 2023); CJEU *Malamud* C-588/21 P (2024). **None bind India.**
- **The Delhi High Court PIL:** **W.P.(C) 11901/2015**, *Public.Resource.Org Inc. & Ors. v. Union of India & BIS*. Relief sought: make all Indian Standards free / nominal cost.
- **What the court held: NOTHING.** The petition was **withdrawn** (reported ~2022) after BIS voluntarily put the majority of its standards online for free *reading* on the BIS portal, substantially giving petitioners what they wanted. *(Withdrawal well-reported — Scroll.in, The Wire, SpicyIP — but the disposal order itself was not read; exact date UNVERIFIED.)*
- **Current status (2026):** **No Indian judicial holding exists** that standards incorporated into law may be freely published. **BIS Act s.11 and s.10(5) are fully in force and unqualified by any Indian court.** As a matter of BIS *policy*, most Indian Standards are now free to *read* on the BIS portal (view-only, typically requires sign-in, **no download or reproduction rights granted**). The "the law belongs to the public" argument is rhetorically available but has **zero binding force in India today.**

### 12.4 ICS codes and ISO/IEC equivalence

- **ICS** (International Classification for Standards) is published by ISO and included in **ISO's Open Data** — the code + field-title list (e.g. "91.100.30 Concrete and concrete products") **can be redistributed**; attribute ISO (confirm the exact Open Data licence text before publishing the list — safest is to link to ISO's file). 
- **"IS X is identical to ISO Y"** is a **bibliographic fact** printed on the IS cover page and in the BIS catalogue — **low risk to store and display.** It does not license reproducing either standard's text.

### 12.5 Demo verdict — can / can't ship

| Content | Store internally (dev DB) | Show a judge (private demo) | Public GitHub / hosted public demo |
|---|---|---|---|
| IS number + full title + year/revision | ✅ (bibliographic facts) | ✅ | ✅ — attribute "Source: BIS catalogue" |
| ICS codes + field titles | ✅ | ✅ | ✅ (ISO Open Data) — attribute ISO, prefer linking |
| IS ⇄ ISO/IEC equivalence flag | ✅ | ✅ | ✅ (fact) |
| QCO / gazette notification text + metadata (title, S.O. no., date, covered-IS list, HS codes) | ✅ | ✅ | ✅ — **Government of India Gazette notifications are government works; Copyright Act s.52(1)(q) exempts Gazette matter** |
| Your own derived regulatory flag (mandatory / CRS / voluntary) | ✅ | ✅ | ✅ (your classification) |
| **Team-written / paraphrased scope summaries** | ✅ | ✅ | ✅ — must be genuinely re-authored, not copied |
| Scope clause / abstract of an IS (verbatim, ~1 para) | ⚠️ small cache for matching only, treat as licensed | ⚠️ 1–2 lines as an evidence excerpt is *defensible* but s.11 has no carve-out — prefer paraphrase / matched keywords | ❌ do not publish scope text at scale |
| Full clauses / requirements / tables / test methods | ❌ (beyond a transient processing copy) | ❌ | ❌ — clear s.11 offence + civil infringement |
| Amendment instruction text | ❌ | ❌ | ❌ |
| Full IS PDF corpus / scraped bulk dataset / mirror of the Public.Resource.Org set | ❌ | ❌ | ❌ |

**Shippable design:** build the matching index on **facts you can hold lawfully** — IS numbers, titles, ICS, equivalence, publication/amendment dates, QCO coverage — plus **team-authored or human-edited paraphrased scope summaries** (not copied from BIS), optionally enriched with freely-usable **QCO/gazette text**. The engine's **output** = citations (IS number, title, current status, mandatory/voluntary flag, QCO reference) + a **link to the standard on the official BIS portal**. Do **not** render IS body text in the product. Evidence excerpts shown to a judge come from **the user's own input spec**, from **QCO/gazette text**, and from **your paraphrased summaries** — never from IS full text. Add a `NOTICE` file: *"Indian Standards are © Bureau of Indian Standards; this project stores only bibliographic metadata and does not reproduce standard text. ICS © ISO, used under ISO Open Data."*

**One-line verdict:** *ship a citation-and-status engine (facts + links + your own summaries + freely-usable QCO/gazette text); do not store, display, or publish the body text, scope clauses, tables, or amendments of Indian Standards — BIS Act 2016 s.11 makes that a fineable offence with no research/demo exception, and no Indian court has carved one out.*

---

## 13. Real BIS Examples

Each traced metadata → lifecycle → references → certification → regulatory relevance.

### 13.1 Cement — `IS 269 : 2015` "Ordinary Portland Cement — Specification (Sixth Revision)"
- **Metadata:** TC `CED 2` (`committeeId` 190), `isStatus` 2 (active), reaffirmed 2020, edition 2015, group taxonomy "Building Materials … / Cement, concrete and Allied Products".
- **Lifecycle:** amalgamated `IS 269:2013` (33 grade), `IS 8112:2013` (43 grade), `IS 12269:2013` (53 grade) into one standard. Those three are **`isStatus` 5 (withdrawn)**, `superseded_byis` → `IS 269 : 2015` — **a lower IS number than two of its predecessors**.
- **References:** `getCrossRefDetails` returns the forward list (cement test methods, aggregates) **and** ~N reverse citations (every concrete standard that cites OPC). Sub-typing test-method vs material needs the PDF.
- **Certification:** under the **Cement (Quality Control) Order, 2003, S.O. 191(E), 17 Feb 2003**. Mandatory. `getGazettedetails` is populated for this record.
- **Regulatory relevance:** a spec citing "IS 8112" or "IS 12269" **must be resolved to `IS 269:2015`** or the mandatory-certification check fails. FMCS confirms real licences against `IS 269 : 2015`.

### 13.2 Structural steel — `IS 2062 : 2011` "Hot Rolled Medium and High Tensile Structural Steel"
- **Metadata:** Reaffirmed 2021, status Active.
- **Lifecycle:** coexists with **`IS 2062 : Part 1 : 2025`** and **`IS 2062 : Part 2 : 2026`** — all Active. "Highest year" would wrongly select Part 2:2026 (quenched & tempered plates).
- **Certification:** under the **Steel and Steel Products (QCO), 2020** (current: S.O. 4637(E), 22-12-2020). Mandatory. That one QCO covers **151 IS numbers**.
- **Regulatory relevance:** a tender for "structural steel to IS 2062" needs the engine to pick the **base 2011 standard or Part 1:2025** by matching the requirement (general hot-rolled sections), not the newest year.

### 13.3 Concrete code of practice — `IS 456 : 2000` "Plain and Reinforced Concrete — Code of Practice"
- **Metadata:** TC `CED 2`, Reaffirmed 2021, status Active, **6 amendments** (title text says "1, 2, 3 & 4" — inconsistent with the count field).
- **Lifecycle:** **26-year-old edition is the current standard.** No newer IS 456 exists. Naive "latest year" logic that discards it is catastrophically wrong for a construction tender.
- **Certification:** *not* under a QCO — a **code of practice**, referenced in building bye-laws and contracts (Rule 24 route (a)/(b), not (c)).
- **Regulatory relevance:** "relevant / contractually binding if cited", not "mandatory via QCO". The engine must distinguish these.

### 13.4 Low-voltage switchgear — `IS/IEC 60947 : Part 5 : Sec 1` (dual-numbered)
- **Metadata:** adoption of IEC 60947-5-1. Degree of equivalence: identical (dual number retained).
- **Lifecycle:** **`: 2024` and `: 2016` editions are BOTH Active** (concurrent running, Rule 28); the 2016 title carries "(Valid upto 12 September 2026)".
- **Certification:** Scheme X — **rating-conditional** ("AC circuit-breakers Category A up to 630 A", "all tests as per IS/IEC 60947 Part 2 except [EMC Annex J]").
- **Regulatory relevance:** the engine must (i) not dedup the two editions, (ii) carry the `valid_until` date, (iii) surface the *rating condition* on the mandate, not just "IS/IEC 60947 → mandatory".

### 13.5 Electronics — `IS/IEC 62368-1 : 2023` "Audio/Video, Information and Communication Technology Equipment — Safety Requirements"
- **Metadata:** adoption of IEC 62368-1:2023.
- **Lifecycle:** **supersedes `IS 13252 Part 1:2010` and `IS 616:2017`** (two different predecessors merged into one).
- **Certification:** **CRS (Scheme II)** — MeitY, S.O. 4997(E), 29 Oct 2025, under CRO 2021. **Two enforcement dates:** 1 May 2026 (Extended Reality products) and 1 November 2028 (everything else). During the window both old and new standards are valid.
- **Regulatory relevance:** a spec for an IT power adapter must land on `IS/IEC 62368-1:2023`, flag it CRS-mandatory, and state the correct enforcement date **for the specific product sub-type**.

### 13.6 PPE — `IS 4151 : 2015` "Protective Helmets for Two Wheeler Riders"
- **Metadata:** status Active.
- **Certification:** "Helmet for riders of Two Wheeler Motor Vehicles (QCO), 2020", **S.O. 4252(E), 26-11-2020**. Mandatory (ISI mark, Scheme I).
- **Regulatory relevance:** "helmet" splits across two QCOs and two ministries — the engine must disambiguate two-wheeler helmets (`IS 4151`) from industrial safety helmets (`IS 2925`) from police helmets by **use case in the procurement text**.

---

## 14. Implications for AI Architecture

### 14.1 The hard boundary: authoritative facts vs AI reasoning

| **AUTHORITATIVE — from scraped structured data, NEVER from the LLM** | **AI REASONING — the LLM's actual job** |
|---|---|
| IS number, canonical designation, edition year | Parse the procurement requirement / tender clause into structured technical parameters |
| Title, technical committee, ICS | Expand domain terminology & synonyms ("rebar" ↔ "reinforcement bar" ↔ "TMT bar" ↔ IS 1786) |
| Status (Active / withdrawn / concurrent), `valid_until` | Generate candidate search queries against the standards index |
| Amendment list & count | Rank candidate standards by relevance to the requirement |
| Supersession edges (supersedes / superseded-by / amalgamated-into) | Classify each hit's role (applicable / normative / test-method / safety / terminology / installation) |
| Reaffirmation year | Draft the human-readable explanation of *why* a standard was recommended |
| QCO applicability, scheme (I/II/IV/X), S.O. number(s), issuing ministry | Identify gaps / risks in the user's draft spec ("you cited a superseded standard") |
| Enforcement date | Summarise the evidence excerpts |
| ISO/IEC counterpart & degree of equivalence | Decide when to abstain / route to human review (horizontal QCOs, low confidence) |

**Where hallucination is dangerous and what stops it:**
- *Inventing an IS number or year* → the response layer only ever emits designations that exist in the **harvested catalogue table** (24,145 rows from `getWebsiteIndianStandardsList`, resolved via `searchKnowStandards`); the LLM proposes, the data layer validates and rewrites.
- *Claiming something is mandatory when it isn't (or vice versa)* → the mandatory flag comes **only** from the `qco_obligation` table join, never from the LLM. The LLM may explain the flag; it may not set it.
- *Citing a withdrawn edition as current* → the version resolver runs after retrieval, using `isStatus` / `withdrawStatus` / `superseded_byis` from the harvested detail records, and replaces any withdrawn designation with its live successor (or flags a concurrent-running pair), with the source + `scraped_at` attached.

### 14.2 Retrieval design

- **Hybrid retrieval** over (a) a **fully harvestable** metadata index (designation, title, BIS group taxonomy, committee, keywords — all from the new-portal API) and (b) — where full text is lawfully available — a chunked-clause vector index over the pre-2018 `law.resource.org` corpus for the demo slice.
- **Metadata + the cross-ref graph are sufficient** for ~10 of the 16 outputs: applicable standards, allied standards, normative/referred (curated `crossRefData`), related material/component, current version, amendments, revisions, withdrawn/superseded, mandatory certification, QCOs.
- **Full text is still required** to reach precision on: test-method standards, safety standards, installation/maintenance cross-refs, and exact clause-2 conformance — the API gives the reference edges but does not sub-type them. This is a **curation task over the demo slice**, not a runtime task.

### 14.3 Confidence & abstention

Every recommendation carries: a relevance score, the evidence excerpt(s), the data source + `scraped_at`, and a **status-confidence** flag (green = single consistent source; amber = the new-portal API and the legacy withdrawn table disagree; red = horizontal QCO / no structured match → human review).

---

## 15. Proposed Data Model

**Evidence-backed entities** (all populatable from harvested data):

| Entity | Key | Populated from |
|---|---|---|
| `Standard` | `(series, number, part, section)` | `getWebsiteIndianStandardsList` (24,145 rows) + `standardNumber` parse |
| `StandardEdition` | `+ edition_year` | `standardNumber` / `publishedOn` |
| `Amendment` | `(standard_edition, amendment_no)` | `getAmendmentDetails` (year + PDF key) |
| `TechnicalCommittee` | `committeeId` (int) + `aliasName` | `getwebsiteAllSectionalCommittees` (415 rows) |
| `TechnicalDepartment` | `departmentId` + `scope` | `fetchDepartmentList` |
| `GroupTaxonomy` | `group / subGroup / subSubGroup` | `getWebsiteStandardDetails` (the working ICS substitute) |
| `QcoObligation` | `(standard, part, section)` | Scheme I/II/IV/X + upcoming-QCO HTML tables |
| `Qco` | `so_number` / title | notification cells + gazette PDFs + `getGazettedetails` |
| `Ministry` | name | upcoming-QCO table (reliable); else inferred from QCO title |
| `Licence` (FMCS) | `cml_no` | `All_fmcs_list.php` |

**Evidence-backed relationships — now including the reference graph:**

| Relationship | Direction | Source | Confidence |
|---|---|---|---|
| `REFERS_TO` | StandardEdition → StandardEdition | **`getCrossRefDetails.crossRefData`** (new portal, unauth) | **High (curated)** |
| `REFERENCED_BY` | StandardEdition → StandardEdition | **`getCrossRefDetails.crossFollowRefData`** — exists only here | **High** |
| `BELONGS_TO` | Standard → TechnicalCommittee | `committeeId` on every record | High |
| `AMENDED_BY` | StandardEdition → Amendment | `getAmendmentDetails` | High |
| `REAFFIRMED_IN` | StandardEdition → year | `reAffirmationYear` + legacy per-committee lists | High |
| `SUPERSEDED_BY` | StandardEdition → StandardEdition | `superseded_byis` / `isStatus`=5; back-fill from title + legacy withdrawn table (dirty) | Medium |
| `AMALGAMATES` | StandardEdition → [StandardEdition] | title text ("Amalgamated revision of …") | Medium (NLP on titles) |
| `MANDATED_BY` | Standard → Qco | Scheme tables | High |
| `ENFORCED_FROM` | QcoObligation → date | upcoming-QCO table (reliable); gazette PDF prose elsewhere | Mixed |
| `PART_OF` | Standard(part) → Standard | shared number | High |
| `EQUIVALENT_TO` / `IDENTICAL_TO` | StandardEdition → ISO/IEC edition | `equivalentIs` / `identical_is` / `equivalenceTypeName` | Medium |
| `HAS_LICENCE` | Standard → Licence | FMCS list | High (foreign only) |
| `CLASSIFIED_UNDER` | Standard → GroupTaxonomy | `groupName`/`subGroupName`/`subSubGroupName` | High |

**Still PROPOSED — needs PDF NLP over the demo slice (the API gives edges but not these sub-types):**

| Relationship | Why |
|---|---|
| `TESTED_BY` (→ test-method standard) | `crossRefData` includes it but does not label it as test-method; clause 7–8 of the PDF does |
| `IMPLEMENTS_SAFETY_OF` (→ safety standard) | in the requirements clauses |
| `INSTALLED_PER` (→ code of practice) | in-body cross-ref |
| `APPLIES_TO` (Standard → Product concept) | requires a product taxonomy + mapping — **the core curation effort** and the actual research contribution of the project |

**Recommendation:** harvest the entities and the `REFERS_TO`/`REFERENCED_BY` graph from the API for the **whole catalogue** (it's cheap enough — ~72k detail calls). Do PDF clause-2/3 extraction and reference **sub-typing** only for the demo slice. The `APPLIES_TO` product mapping is where the team's own work goes.

---

## 16. What We Can Build for SIH

**A genuinely impressive prototype scope:**

1. **Curated corpus of 200–500 standards** across 4–5 demo domains chosen for regulatory contrast:
   - Cement/concrete (QCO-mandatory + a code of practice that isn't) — `IS 269`, `IS 456`, `IS 8112` (the supersession trap)
   - Structural steel (one QCO → many standards; multi-part) — `IS 2062`, `IS 1786`, `IS 800`
   - Electronics/IT hardware (CRS, concurrent running, migration) — `IS/IEC 62368-1`, `IS 13252`, `IS 616`
   - PPE / helmets (two QCOs, ministry split, use-case disambiguation) — `IS 4151`, `IS 2925`
   - A voluntary-only domain (to show the "relevant, not mandatory" path) — e.g. a textile or furniture standard
2. **Authoritative data layer — and you can go wider than a slice for metadata.** Harvest the **entire 24,145-record catalogue** + `getWebsiteStandardDetails` + `getCrossRefDetails` (the full forward/reverse reference graph) + the 415-committee master list from the new-portal API. Add the scraped Scheme I/II/IV/X + upcoming-QCO tables (full — they're small), the per-committee withdrawal/reaffirmation lists, and the FMCS list. This is a weekend of scraping, not a research project.
3. **Supersession + amalgamation graph** hand-verified for the demo slice (including `IS 8112 → IS 269:2015`), machine-built from `superseded_byis` + title parsing for the rest.
4. **Reference sub-typing** (test-method / safety / installation) from clause 2/3 of the ~300–500 curated demo-slice PDFs (`law.resource.org` + `archive.org`, pre-2018).
5. **Product → standard mapping** (`APPLIES_TO`) — the team's actual contribution: a curated taxonomy over the demo domains, plus an LLM classifier for open-set matching.
6. **LLM pipeline:** requirement parsing → terminology expansion → hybrid retrieval (metadata + group taxonomy + cross-ref graph) → role classification → version resolution (data layer) → mandatory-flag join (data layer) → explanation generation → gap warnings.
7. **Demo narrative:** paste a real tender clause → ranked standards list, each with current version, a mandatory/voluntary/upcoming badge with the QCO citation + enforcement date, its normative/test-method companions **pulled live from the cross-ref graph**, an evidence excerpt, and a "⚠ your spec cites IS 8112 which was superseded by IS 269:2015" warning.

**Q4 answer — yes, and the metadata layer can actually be *complete*.** Only the full-text / reference-sub-typing / product-mapping work is slice-scoped.

---

## 17. What We Cannot Reliably Build

- **A guaranteed-current index with no pipeline.** The new-portal API *can* be harvested completely, but it is undocumented and unversioned — a "current as of today" claim still needs a scheduled re-harvest with diff-based QA, and lifecycle changes still land in the Gazette (unscrapable) before they propagate to the portal.
- **Reference *sub-typing* corpus-wide.** The `REFERS_TO` / `REFERENCED_BY` *edges* are harvestable for all 24,145 records; labelling each edge as test-method / safety / terminology / installation needs the PDF body and is only feasible for the demo slice (copyright + the pre-2018 freeze on free full text).
- **Authoritative enforcement dates for already-in-force QCOs.** Only the 118-row upcoming-QCO table has a date column; for everything already mandatory the date is buried in gazette-PDF prose.
- **Domestic ISI licensee verification.** CAPTCHA-gated, one at a time.
- **Coverage of horizontal/omnibus QCOs by lookup.** The Household Appliances QCO 2024 and the Omnibus Technical Regulation 2024 make products mandatory by scope description — the engine can only flag "this may fall under a horizontal QCO — verify".
- **Reliable CRS registration data.** The public search returns zero rows.
- **Full standard text redistribution.** Copyright (BIS Act s.11).

---

## 18. Open Questions

**Resolved by this research:** the catalogue *can* be fully enumerated unauthenticated (§2.2); the 415-committee master list exists and `commttid = base64(committeeId)` (§2.1–2.2); forward **and reverse** references are structured (`getCrossRefDetails`, §5); the BIS SMART / NISO-STS XML RFP exists but is not a public feed (§11); `data.gov.in` has no BIS dataset (§11).

**Still open:**

1. Does direct GET of the OCI MinIO PDF bucket (`BisProd/…/456.pdf` keys) work, or is the download route auth/watermark-gated? (ASSUMPTION: gated.)
2. What is the value vocabulary of `equivalenceTypeName` beyond "Not Equivalent" / — presumably IDT / MOD / NEQ per ISO/IEC Guide 21, unconfirmed.
3. Are QCO gazette PDFs individually addressable in a predictable URL pattern, enabling bulk fetch? (531 links harvested from Scheme I, but no pattern confirmed.)
4. Does BIS's free-access / "Standards for students" initiative still operate in 2026, and what exactly does it gate (a `Student` role exists in the portal's role list)?
5. Does any GeM category expose a typed "IS number" field, or is the mapping entirely internal? *(live GeM category pages not inspected.)*
6. Exact verbatim text of the BIS copyright page and IS front-matter boilerplate (served as a binary blob this pass).
7. How stale is `crossRefData` on legacy records — does BIS curate references for pre-2000 standards, or only newer ones?
8. Rate-limit / IP-block behaviour of `standardsadmin.bis.gov.in` under a sustained full-catalogue harvest (not stress-tested — only ~1 req/s sampled).

---

## 19. Critical Findings

### Q1. What BIS data is publicly accessible?
**Answer:** **The entire standards catalogue** (24,145 records) and its metadata, amendment history, lifecycle status and **forward + reverse cross-reference graph** — all via the new portal's unauthenticated JSON API (§2.2). Plus: the four compulsory-certification HTML tables + upcoming-QCO table; the legacy per-committee withdrawal/reaffirmation/revised DataTables; the FMCS foreign-licensee list; `getData.php`; the 415-committee master list; CRS aggregate dashboard counts; the HUID assaying-centre list; the hallmarking district PDF; ~531 QCO gazette PDFs; and a pre-2018 full-text mirror at `law.resource.org` + `archive.org`. **Not accessible:** domestic ISI licensee lists (CAPTCHA), CRS registration search (returns 0 rows), gazette search (HTTP 500), post-2018 full text (copyright + no free source), enforcement dates for in-force QCOs (PDF prose). **Evidence:** §2, §7, §9, §10, verified 2026-09-10.

### Q2. What BIS data is structured?
**Answer:** **Much more than expected.** The new-portal API returns clean JSON for the whole catalogue, per-standard detail, amendments, cross-references, committees and departments. `getData.php` and the CRS dashboard also return JSON. The **regulatory overlay** (QCO/Scheme tables) is only **semi-structured HTML** requiring a parser (with `rowspan` forward-fill for Scheme I). There is still **no official CSV/XML bulk dataset** and no data.gov.in resource — but the undocumented API is a working substitute. **Evidence:** §2.2, §7.2, §11.

### Q3. What BIS data is only available in PDFs?
**Answer:** Full standard text and all clause-level content (scope, the verbatim clause-2 reference list, terminology, requirements, test methods, marking, sampling); amendment instruction text; full QCO text and enforcement dates for already-in-force QCOs; gazette establish/withdraw schedules; the hallmarking district list; the *sub-typing* of references (which cross-ref is a test-method vs safety vs terminology standard). **Evidence:** §4.2, §5, §6.4, §7.2.

### Q4. Can we build a useful SIH prototype without the complete corpus?
**Answer: Yes, comfortably.** A curated slice of 200–500 standards across 4–5 contrasting domains, with a hand-verified supersession graph and reference extraction for just that slice, demonstrates every capability that matters. The prototype's value is reasoning + regulatory linkage + version resolution, not coverage. **Evidence:** §16.

### Q5. What minimum dataset would be sufficient for an impressive prototype?
**Answer:** (a) the **full 24,145-record catalogue + metadata + cross-ref graph** from the new-portal API (a weekend of scraping — no reason to sub-sample the metadata layer); (b) all ~750 rows of Scheme I/II/IV/X + 118 upcoming-QCO rows; (c) the legacy withdrawal/reaffirmation lists for cross-check; (d) FMCS rows filtered to demo IS numbers; (e) ~300–500 full-text PDFs from `law.resource.org` for **4–5 demo domains** (cement, steel, electronics, PPE, one voluntary-only); (f) a hand-verified supersession + QCO graph + product taxonomy over that slice. **Evidence:** §11 appendix, §16.

### Q6. How could we collect / update the dataset?
**Answer:** The harvest recipe (§11 appendix, all unauthenticated `POST` JSON):
1. `getwebsiteAllSectionalCommittees` (1 call) → 415 committees + numeric ids; `fetchDepartmentList` → departments + scopes.
2. `getWebsiteIndianStandardsList` pages 1–242 at `pageSize:100` → 24,145 rows with `standardId` + `standardEncId`.
3. Per standard: `getWebsiteStandardDetails` + `getCrossRefDetails` + `getAmendmentDetails` (~72k calls; be polite, ~1–2 req/s).
4. Parse the 5 QCO HTML tables (with `rowspan` forward-fill); iterate the legacy `all_withdrawn_/all_reaff_/all_revised_stndrd_commtt` over `base64(committeeId)` for cross-check; fetch `All_fmcs_list.php`.
5. Full text (pre-2018 demo slice): `law.resource.org/pub/in/bis/` PDFs + `archive.org` TXT.
Snapshot every pull with `scraped_at`; diff to detect new QCOs / withdrawals / revisions; manual QA on diffs. Gazette monitoring stays manual (search broken). Design the ingest layer to swap in NISO-STS XML when BIS's SMART feed ships. **Evidence:** §2.2, §11.

### Q7. What relationships between standards can we extract?
**Answer:** **Almost all of them, from the API.** `REFERS_TO` **and `REFERENCED_BY`** (forward + reverse, via `getCrossRefDetails` — the reverse graph exists nowhere else), `BELONGS_TO` committee, `AMENDED_BY`, `REAFFIRMED_IN`, `PART_OF`, `MANDATED_BY` QCO, `EQUIVALENT_TO`/`IDENTICAL_TO` ISO/IEC, `CLASSIFIED_UNDER` (group taxonomy) — all harvestable, catalogue-wide. `SUPERSEDED_BY` / `AMALGAMATES` — yes but sparse on legacy records, needs title-parsing back-fill. **Only the reference *sub-types*** (test-method / safety / terminology / installation) and the `APPLIES_TO` product mapping need PDF NLP / curation over the demo slice. **Evidence:** §5, §15.

### Q8. How can we determine the current valid version?
**Answer:** Not by year. Resolve the citation to `(series, number, part, section)`; enumerate all editions/parts (`{"search":"<number>"}` on the bulk endpoint returns the family); read `isStatus` / `withdrawStatus` / `validUpto` / `superseded_byis` from `searchKnowStandards` + `getWebsiteStandardDetails`; for a bare "IS N" pick the part whose scope matches the requirement (not max year); follow `SUPERSEDED_BY` edges (allowing number changes and amalgamation) to the live successor; keep the `validUpto` date for concurrent-running pairs; if the API and the legacy withdrawn table disagree, surface both with sources. **Evidence:** §2.2, §6.2, §6.3 — seven verified failure modes of "highest year wins".

### Q9. How can we distinguish relevant standards from mandatory standards?
**Answer:** A standard is **mandatory** iff its IS number appears in a Scheme I/II/IV/X table (→ carry the QCO title, S.O. number, scheme, gazette URL) or the upcoming-QCO table (→ carry ministry + enforcement date). Everything else is **relevant/voluntary** (binding only if a contract or legislation cites it — Rule 24). Plus a **horizontal** bucket: products matching the Household Appliances QCO 2024 or Omnibus Technical Regulation 2024 scope predicates → flag for human review. Watch the traps: rowspan, superseded numbers, rating conditions. **Evidence:** §7.1, §7.3, §7.4, §7.9.

### Q10. What are the biggest data-access limitations?
**Answer:** (1) The rich API is **undocumented and unversioned** — it can break or be locked down without notice, and there is no SLA or terms of use. (2) Sources **disagree on status** (new API vs legacy withdrawn table vs BSB Edge). (3) **Gazette search returns HTTP 500** — the legally authoritative lifecycle source is not queryable. (4) **Enforcement dates for in-force QCOs are PDF-prose only.** (5) **CRS licensee search returns zero rows; domestic ISI verification is CAPTCHA-gated.** (6) **Post-2018 full text has no free source** and is copyrighted. (7) The regulatory overlay (QCO ↔ IS) is **HTML-table-only, with `rowspan` traps.** **Evidence:** §2.2, §6.4, §7.2, §7.5, §7.6, §11, §12.

### Q11. What copyright / licensing issues could affect our prototype?
**Answer:** BIS Act 2016 **s.11(1)** prohibits publishing/reproducing/recording any Indian Standard *or part thereof* without BIS authorisation; **s.10(5)** vests copyright in BIS; **s.29(1)** sets a fine up to **₹5,00,000**. The **only** carve-out is a personal-use copy — **there is no research/demo/fair-dealing exception in the Act**. So: **full clauses, requirements, tables, test methods and amendment text cannot be stored beyond transient processing, displayed, or published.** **Metadata (number, title, year, committee, status, ICS, ISO/IEC equivalence) is factual and safe** to store and display. **QCO / gazette text is a Government work** — Copyright Act s.52(1)(q) exempts Gazette matter, so it *is* freely usable. The `law.resource.org` mirror rests on a "standards incorporated into law" theory that **no Indian court has ever ruled on** — the Delhi High Court PIL (W.P.(C) 11901/2015) was **withdrawn**, not decided. **Ship a citation-and-status engine with team-paraphrased scope summaries; never IS body text; add a NOTICE crediting BIS and ISO.** **Evidence:** §12.

### Q12. What assumptions about BIS data would be dangerous?
**Answer:**
1. "Highest year = current version" — **wrong 7 ways** (§6.2).
2. "One IS number = one document" — parts/sections/editions/languages coexist with different statuses.
3. "If it's not in the QCO list by that exact IS number, it's not mandatory" — superseded numbers and horizontal QCOs break this.
4. "The portal status field is authoritative" — the three portals disagree; the Gazette is authoritative and unscrapable.
5. "A reaffirmation year means the standard is current" — it's retained on withdrawn records too.
6. "One QCO maps to one standard" — the Steel QCO maps to 151.
7. "The weekly bulletin is a withdrawal feed" — its Withdrawn section is always empty.
8. "The new-portal API is stable / official / will stay open" — it is undocumented, unversioned, and could be locked behind auth at any time. Snapshot everything.
9. "`crossRefData` is the verbatim clause-2 list" — it is a curated approximation; use the PDF for exactness.
10. "We can ship standard text in the demo" — copyright (s.11), fine up to ₹5,00,000, no exception.
11. "data.gov.in must have a BIS dataset somewhere" — it does not; don't design around one.

---

## 20. Sources

All accessed 2026-09-10.

**Statute / rules / manuals**
- BIS Act, 2016 (Bilingual) — https://www.bis.gov.in/wp-content/uploads/2020/12/BIS-Act-2016-Bilingual.pdf
- BIS Rules, 2018 (with amendments to Sep 2020) — https://www.bis.gov.in/wp-content/uploads/2020/10/BIS-Rules-2018_amendments_Sep_15102020.pdf
- Manual for Standards Formulation, 2022 (2nd Revision) — https://www.bis.gov.in/wp-content/uploads/2022/12/Revised-SFM.pdf
- IS 12 : 2005 — Guide for Drafting and Presentation of Indian Standards — https://law.resource.org/pub/in/bis/S07/is.12.2005.pdf

**Certification / QCO / CRS**
- BIS — Products under Compulsory Certification (hub) — https://www.bis.gov.in/product-certification/products-under-compulsory-certification/
- Scheme I (ISI mark) — https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en
- Scheme II (CRS / Registration) — https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-ii-registration-scheme/?lang=en
- Scheme IV — https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-4/?lang=en
- Scheme X — https://www.bis.gov.in/products-under-compulsory-certification-scheme-x/?lang=en
- Upcoming QCOs (notified & due for implementation) — https://www.bis.gov.in/upcoming-qcos-notified-and-due-for-implementation/?lang=en
- Guidance document on QCOs — https://www.bis.gov.in/wp-content/uploads/2021/07/Guidance-document-on-QCOs-Revised-1.pdf
- PIB / Lok Sabha written reply, Ministry of Consumer Affairs, 12 Mar 2025, PRID 2110935 — https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2110935
- CRS BIS portal — https://www.crsbis.in/BIS/
- Cement (QCO) 2003, S.O. 191(E) — https://www.bis.gov.in/MandatoryProducts/QCOrder/SO-No-191(E).pdf
- Steel and Steel Products (QCO) 2020 — https://bis.gov.in/wp-content/uploads/2020/03/Steel-QCO-14022020-1.pdf
- Helmet for Two-Wheeler Riders (QCO) 2020 — https://bis.gov.in/wp-content/uploads/2020/12/Helmet-for-riders-of-Two-Wheeler-Motor-Vehicles-Quality-Control-Order-2020.pdf
- Helmet for Police Force / Civil Defence (QCO) 2023 — https://bis.gov.in/wp-content/uploads/2023/10/Helmet-for-Police-Force-Civil-Defence-Personal-Protection-QCO-2023.pdf
- Migration to IS/IEC 62368-1:2023 (S.O. 4997(E)) — https://www.bis.gov.in/wp-content/uploads/2025/11/Migration-to-IS-IEC-62368-Part-1-2023-from-IS-13252-Part-1-2010-and-IS-616-2017.pdf
- MoHI — Machinery & Electrical Equipment Safety (Omnibus Technical Regulation) Order 2024 — https://heavyindustries.gov.in/en/machinery-and-electrical-equipment-safety-omnibus-technical-regulation-order-2024 · gazette PDF https://heavyindustries.gov.in/sites/default/files/2024-09/otr_gazette_notification.pdf

**Catalogue / metadata / lifecycle**
- BIS new standards portal (SPA) — https://standards.bis.gov.in/website/know-your-standards
- New-portal backend (unauthenticated, verified 2026-09-10):
  - `POST https://standardsadmin.bis.gov.in/proposal-service/getWebsiteIndianStandardsList` — whole catalogue, `{"page":N,"pageSize":100}`, `totalRecord:24145`
  - `POST https://standardsadmin.bis.gov.in/review-service/searchKnowStandards` — `{"searchText":"IS 456:2000"}`
  - `POST https://standardsadmin.bis.gov.in/review-service/getWebsiteStandardDetails` — `{"encId":"…","fromPage":"guestUserPage"}`
  - `POST https://standardsadmin.bis.gov.in/review-service/getCrossRefDetails` — forward + reverse cross-refs
  - `POST https://standardsadmin.bis.gov.in/review-service/getAmendmentDetails` — `{"standardId":"<encId>"}`
  - `POST https://standardsadmin.bis.gov.in/technical-committee/getwebsiteAllSectionalCommittees` — 415 committees
  - `POST https://standardsadmin.bis.gov.in/master-service/fetchDepartmentList` — departments + scope
- BIS legacy services portal — https://www.services.bis.gov.in/php/BIS_2.0/
  - `.../bisconnect/standard_review/Standard_review/all_reaff_stndrd_commtt` · `all_withdrawn_stndrd_commtt` · `all_revised_stndrd_commtt` · `dep_commtt` (`commttid = base64(committeeId)`)
  - `.../bisconnect/knowyourstandards/Indian_standards/isdetails_mnd/<pk_is_id>` (login-free detail page)
  - `.../php/BIS_2.0/fmcs/getData.php?tag=<partial IS number>` (JSON designation resolver)
- Standard review dashboard — https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/standard_review/Standard_review
- Weekly Standards Bulletin list — https://services.bis.gov.in/php/BIS_2.0/dgdashboard/weekly-bulletin-list
- BIS e-Gazette notification index — https://www.bis.gov.in/e-gazette-notification/
- Gazette of India (BIS withdrawal notification, 3 Jul 2024) — https://egazette.gov.in/WriteReadData/2024/255168.pdf
- Gazette of India (BIS notification, 10 Feb 2025) — https://egazette.gov.in/WriteReadData/2025/260878.pdf
- BSB Edge — BIS e-sale catalogue — https://standardsbis.bsbedge.com/ · `/BIS_Withdrawn.aspx` · `/BIS_FreeAmendments.aspx?id=0`
- BIS "SMART" — XML Conversion of Indian Standards RFP (ITSD, 2024-03-20) — https://www.bis.gov.in/wp-content/uploads/2024/03/ITSD_Tender_document_20240320.pdf

**Conformity / licensee data**
- FMCS foreign-manufacturer licensee list — https://www.services.bis.gov.in/php/BIS_2.0/fmcs/All_fmcs_list.php
- HUID — Assaying & Hallmarking Centre list — https://huid.manakonline.in/MANAK/AHCListForWebsite
- Hallmarking — phase-wise district coverage PDF — https://www.bis.gov.in/wp-content/uploads/2026/09/Phase-wise-coverage-of-districts-under-gold-mandatory-hallmarking.pdf

**Public full-text mirror**
- Public.Resource.Org — BIS standards mirror — https://law.resource.org/pub/in/bis/ · archive.org items `gov.in.is.<n>.<y>`

**Procurement**
- General Financial Rules 2017 (Chapter 6) — https://doe.gov.in/files/inline-documents/GFR2017.pdf
- Manual for Procurement of Goods, Second Edition 2024 (DoE) — https://doe.gov.in/circulars/manual-procurement-goods-second-edition-2024 · PDF https://www.dgciskol.gov.in/Writereaddata/Tender/Manual_Goods_2024.pdf
- DoE OM F.N.12/17/2019-PPD dated 12.05.2020 (Indian technical specs preference) — cited in Manual 2024 footnote 41
- Public Procurement (Preference to Make in India) Order 2017, DPIIT P-45021/2/2017-PP (B.E.-II) — consolidated in Manual 2024 Ch. 1
- Government e-Marketplace — https://gem.gov.in

**Copyright**
- BIS Act 2016 (No. 11 of 2016) — ss. 10(5), 11, 29 — https://www.bis.gov.in/wp-content/uploads/2020/12/BIS-Act-2016-Bilingual.pdf · indiacode.nic.in A2016-11
- BIS copyright page + Form-A — https://www.bis.gov.in/copyright/
- *Public.Resource.Org Inc. & Ors. v. Union of India & BIS*, W.P.(C) 11901/2015, Delhi HC — petition text https://law.resource.org/pub/in/bis.gov.in.20151211.html (withdrawn ~2022, no merits ruling)
- ICS — ISO Open Data — https://www.iso.org/publication/PUB100033.html

**data.gov.in** — searched 2026-09-10; **no BIS dataset found** (only "Indian Bureau of Mines").

---

## TOP 10 DISCOVERIES

1. **The entire 24,145-record Indian Standards catalogue is harvestable with zero authentication.** `POST https://standardsadmin.bis.gov.in/proposal-service/getWebsiteIndianStandardsList` with `{"page":N,"pageSize":100}` returns the whole catalogue (`totalRecord: 24145`, 2026-09-10) in 242 requests — CORS `*`, no key, no throttling seen. This flips the project's central assumption: we do **not** need to sub-sample the metadata layer, and "RAG over BIS PDFs" was never the right frame — there is a de-facto JSON API.

2. **BIS exposes REVERSE references — and it is the only place on Earth that does.** `POST review-service/getCrossRefDetails {"encId":…}` returns both `crossRefData` (forward: "refers to") **and `crossFollowRefData`** (reverse: "is referred to by" — `IS 456` → 197 citing standards). Each entry carries its own `encId`, so the citation graph is directly traversable. A standards knowledge graph — the thing that makes "allied / normative / supporting standards" answerable — can be built **from the API alone**, not from PDF NLP.

3. **The regulatory overlay is the opposite story: 187 QCOs / 769 products, published as exactly four HTML tables** (Scheme I: 639 products, II: 74, X: 32, IV: 2) plus a 118-row "Upcoming QCOs" table plus ~531 gazette PDFs — and nothing on `data.gov.in` (which has *no* BIS dataset at all). The catalogue is datafied; its mandatory-vs-voluntary status is not. That asymmetry defines the build.

4. **Scheme I's notification column uses `rowspan="151"`** (Steel QCO) and `rowspan="16"` (Cement). A row-by-row parser silently drops the QCO for 150 of 151 steel standards. Forward-filling rowspans is the #1 scraping bug for this project.

5. **The superseding standard can have a LOWER IS number, and one standard can absorb several.** `IS 8112:2013` (OPC 43-grade) and `IS 12269:2013` (OPC 53-grade) were both superseded by **`IS 269:2015`**. A tender citing "IS 8112" — a standard under *no* QCO — must resolve to `IS 269:2015`, which *is* mandatory. Miss this and the engine mislabels real tenders. Amalgamation is often recorded **only in free-text titles** ("Amalgamated revision of IS 2421, 6677, 8652…").

6. **Two editions of the identical standard can both be legally "Active" at once** (concurrent running, BIS Rules 2018 Rule 28): `IS/IEC 60947 : Part 5 : Sec 1` exists as both `:2024` and `:2016`, the older carrying "Valid upto 12 September 2026". The `searchKnowStandards` response exposes `validUpto` as a field — so the version resolver must return *sets* with `valid_until` dates, never `max(year)`.

7. **`isStatus` and `withdrawStatus` are queryable fields on the new API** (`isStatus` 2 = active, 5 = withdrawn/superseded — verified `IS 3021:1975` → 5). This is the reliable withdrawal signal — far better than the legacy portal's red-text `withdrawn_status` (whose field name `referirmatin_year` is literally misspelled in BIS's production JS) or the Weekly Bulletin (whose "Standards Withdrawn" section is *always* empty across 30+ issues despite 11,277 withdrawn standards on record).

8. **BIS's sources still disagree on status**, so the API is necessary but not sufficient: `IS 516 : 1959` is "withdrawn" on the legacy services portal and "Active, Reaffirmed 2018" on BSB Edge. The Gazette is legally authoritative but its search returns HTTP 500. The engine must carry status per-source and amber-flag conflicts.

9. **The legacy per-committee endpoints still work, and `commttid` is just `base64(committeeId)`** — where `committeeId` comes from the new portal's `getwebsiteAllSectionalCommittees` (415 committees, numeric ids). So one call to the new portal unlocks the entire legacy reaffirmation/withdrawal/revised DataTable set for cross-checking. Verified: `base64("190") = "MTkw"` = CED 2.

10. **BIS is actively building a NISO-STS tagged-XML feed** ("SMART — Standards Machine Applicable, Readable and Transferable"; RFP `ITSD_Tender_document_20240320.pdf`, 2024-03-20) — not public yet. Combined with the fact that free full text is frozen at ~2018 (`law.resource.org`), the ingestion layer should be built to swap the HTML/JSON scrape for official XML later, and full-text work should be scoped to the pre-2018 demo slice only. **Copyright is hard: BIS Act s.11 — fine up to ₹5,00,000, no fair-dealing exception, and the one Indian court case (W.P.(C) 11901/2015) was withdrawn without a ruling — so the demo ships citations + status + team-paraphrased summaries, never standard body text.**

---

*Document generated 2026-09-10 from four primary-source research threads. All four complete.*
