# SIH26108 — Implementation Spec / PRD

> **Status:** ready-for-agent · **Owner:** Sourav · **Tracker issue:** [#1](https://github.com/Souravkumarverma123/recommendation-engine/issues/1)
> Synthesised from the research + grilling in the design conversation. No new decisions introduced here.
> Supporting docs: [`docs/demo-flow.md`](./demo-flow.md), [`docs/project-plan.md`](./project-plan.md), [`docs/research/sih26108-bis-ecosystem-data-archaeology.md`](./research/sih26108-bis-ecosystem-data-archaeology.md), [`docs/research/sih26108-build-approach.md`](./research/sih26108-build-approach.md).

---

## Problem Statement

A government procurement officer drafting a tender for goods or works must, by the General Financial Rules and the Manual for Procurement of Goods:

1. **identify every applicable Indian Standard** for what is being bought (product standards, and their normative / test-method / safety / terminology companions),
2. **confirm each cited standard is the current edition** — not one that has been withdrawn, revised, or superseded, and
3. **determine whether conformity is legally mandatory** — i.e. whether a Quality Control Order (QCO) makes BIS certification compulsory for that product — or merely a voluntary benchmark.

Today this is done by hand. It takes days, requires specialist knowledge of the BIS catalogue, and the errors are expensive:

- Citing a **withdrawn or superseded** standard in a tender is an audit finding.
- Writing *"shall bear the ISI mark"* for a product that is **not** under any QCO is a **restrictive specification** (GFR Rule 144) that can get the tender legally challenged.
- Missing a QCO that came into force recently means the tender fails to require mandatory certification.

No existing tool solves this. The BIS portal lets you *search* standards; it does not tell you *which standards apply to your specification* or *whether compliance is mandatory*. The regulatory layer (187 QCOs covering ~769 products) is published only as HTML tables and gazette PDFs, disconnected from the catalogue.

## Solution

A web application where a procurement officer pastes a procurement requirement — a product description, a technical specification, or a tender clause, **in English or Hindi** — and receives a ranked list of applicable Indian Standards. For each recommended standard the officer sees:

- the **current edition** (with a note if it supersedes/replaces an older one the officer may have had in mind);
- a **regulatory badge** — `MANDATORY` / `VOLUNTARY` / `UPCOMING` — and when mandatory or upcoming, the **QCO citation**: order title, S.O. number, and enforcement date;
- the **allied standards** it depends on, each tagged by role (normative reference / test method / safety / terminology / installation);
- an **evidence excerpt** — the phrase(s) in the officer's input that triggered the recommendation, so the choice can be defended in file notes and to audit;
- **gap warnings** about the officer's draft: a cited standard that has been superseded, a brand name that violates the no-brand rule, a foreign/ISO standard cited where an equivalent Indian Standard exists, non-metric units;
- **ready-to-paste tender clause language** referencing the chosen standard and the correct certification requirement.

The regulatory badge is produced by an **independent check of the QCO layer**, keyed on the product/standard — never inferred from the fact that a standard exists. "No QCO found" is a positive, verified result, not an absence of information.

The system separates **authoritative facts** (standard number, title, edition year, lifecycle status, supersession, QCO applicability, enforcement date) — which come only from a structured database harvested from BIS — from **AI reasoning** (understanding the request, ranking candidates, classifying roles, writing the explanation and the draft clause). The language model proposes; the data layer validates and overrides. The system is structurally unable to invent a standard number or misreport a Quality Control Order.

---

## User Stories

**Core recommendation**

1. As a procurement officer, I want to paste a free-text procurement requirement and get a ranked list of applicable Indian Standards, so that I do not have to search the BIS catalogue by hand.
2. As a procurement officer, I want each recommended standard shown with its full designation and title, so that I can cite it correctly in the tender.
3. As a procurement officer, I want the results ranked by relevance to my requirement, so that the most important standard is at the top.
4. As a procurement officer, I want a short explanation of *why* each standard was recommended, so that I understand the recommendation rather than trusting a black box.
5. As a procurement officer, I want the phrase(s) from my own input that triggered each recommendation highlighted as evidence, so that I can justify the choice in my file notes and to an auditor.
6. As a procurement officer, I want to submit either a one-line product description or a multi-paragraph specification and get sensible results for both, so that the tool fits however much detail I have.

**Current version / lifecycle**

7. As a procurement officer, I want each recommended standard shown as its current edition, so that I never cite a withdrawn or superseded standard.
8. As a procurement officer, I want to be warned when a standard I mentioned in my draft has been withdrawn or superseded, and told what replaced it, so that I correct the citation before publishing the tender.
9. As a procurement officer, I want supersession followed even when the replacement has a different (or lower) standard number or is a part of another standard, so that "conforming to IS 8112" correctly resolves to the standard that actually applies today.
10. As a procurement officer, I want to know when two editions of a standard are both currently valid (concurrent running), so that I do not wrongly exclude a compliant supplier.

**Independent regulatory / QCO check**

11. As a procurement officer, I want each recommended standard flagged as MANDATORY, VOLUNTARY, or UPCOMING, so that I know whether to require certification or merely reference the standard.
12. As a procurement officer, I want the system to check the QCO layer independently of whether a standard was found, so that a `VOLUNTARY` result means "checked and confirmed not mandatory", not "we didn't look".
13. As a procurement officer, when a standard is mandatory I want the QCO citation shown — order title, S.O. number, enforcement date — so that I can reference the legal basis in the tender.
14. As a procurement officer, when a QCO's enforcement date is in the future (or phased), I want that date shown, so that I know from when the requirement bites.
15. As a procurement officer, I want the correct clause wording generated for each case — "shall bear the Standard Mark of BIS under licence" for mandatory, "shall conform to IS xxxx or equivalent" for voluntary — so that I do not over-specify or under-specify.
16. As a procurement officer, I want a warning if my draft requires an ISI mark for a product that has no QCO, so that I do not create a restrictive specification.

**Allied standards / relationships**

17. As a procurement officer, I want the normative references of a recommended standard listed, so that I know which other standards the tender implicitly requires.
18. As a procurement officer, I want the test-method standards associated with a recommended standard shown, so that the tender's inspection and conformity clauses are complete.
19. As a procurement officer, I want each allied standard tagged by role (normative / test method / safety / terminology / installation), so that I can place it in the right part of the specification.
20. As a procurement officer, I want the ISO/IEC equivalent of a recommended standard shown when one exists, so that I can respond to suppliers who cite the international standard.

**Multilingual**

21. As a Hindi-first procurement officer, I want to describe my requirement in Hindi and get recommendations, so that I am not forced to work in English.
22. As a procurement officer, I want the explanation and draft clause returned in the language I asked in, so that I can use the output directly.
23. As a procurement officer, I want standard numbers and titles kept in their canonical form regardless of my query language, so that the citations are unambiguous.

**Gap warnings**

24. As a procurement officer, I want to be told which parameters the applicable standard covers that my draft specification omits, so that I can make the spec complete.
25. As a procurement officer, I want brand names and proprietary terms in my draft flagged, so that I comply with the no-brand rule.
26. As a procurement officer, I want to be warned when I have cited a foreign or ISO standard for which an equivalent Indian Standard exists, so that I comply with the preference for Indian standards.

**Trust / safety of the output**

27. As a procurement officer, I want every standard number in the output to be one that actually exists in the BIS catalogue, so that I never paste a hallucinated citation into a tender.
28. As a procurement officer, I want the source and freshness of each fact shown (which BIS dataset, when harvested), so that I know how current the information is.
29. As a procurement officer, I want the system to say "no confident match — review manually" rather than guess, when my requirement does not map cleanly to a standard.

**Data ingestion (operator / developer)**

30. As an operator, I want to run one command to harvest the full BIS catalogue (number + title for every standard) into the database, so that search has coverage of the whole catalogue.
31. As an operator, I want to harvest full metadata and the cross-reference graph for a named set of demo standards, so that the demo domains have depth without harvesting all 24,000.
32. As an operator, I want the mandatory QCO obligations for the demo domains loaded from a reviewed data file, so that the regulatory check works before the full QCO scraper is built.
33. As an operator, I want each harvest run recorded (kind, count, timestamp, ok/failed), so that I can tell what data is loaded and when it was refreshed.
34. As a developer, I want a single function that parses any BIS designation string into a canonical key, so that tender text, catalogue rows, and QCO rows all resolve to the same standard consistently.
35. As a developer, I want the BIS API client to throttle and retry politely, so that harvesting does not hammer a government server or fail on transient errors.

**Demo / presentation**

36. As a hackathon judge, I want to see the chair scenario return MANDATORY and the concrete-code scenario return VOLUNTARY through the same pipeline, so that I can see the independent regulatory check working in both directions.
37. As a presenter, I want to run the BIS API live from a terminal, so that I can prove the data source is real.
38. As the team, I want the running prototype deployable with one `docker compose up` on a single AWS box, so that we can demo it on our own infrastructure.

---

## Implementation Decisions

### Architecture

- **Existing monorepo** (Turborepo + pnpm). Apps: `apps/web` (Next.js + tRPC React Query client), `apps/api` (Express + tRPC + auto-generated OpenAPI). Packages: `packages/database` (Drizzle), `packages/services` (domain/service layer), `packages/trpc` (router), `packages/logger`.
- **A new app `apps/harvester`** — a `tsx` script that reads the BIS API and writes to Postgres via `packages/database`.
- **Separation of concerns:** authoritative facts (designation, title, edition year, `isStatus`, withdrawn/superseded, QCO applicability, S.O. number, enforcement date) are read only from the database. The LLM never writes these and never has the final say on them — it proposes candidates and prose; the data layer resolves versions and sets the regulatory flag.
- **The QCO check is a separate query** against the obligations data, keyed on the normalised standard number / product, executed regardless of retrieval results. Its "not found" outcome is an explicit `VOLUNTARY` verdict.

### Database (frozen day 1 — PRD §Contracts)

- **PostgreSQL 16** via the `pgvector/pgvector:pg16` image. `vector` extension enabled on first boot (`scripts/init-db.sql`) and as the first line of the Drizzle migration for hosted Postgres.
- **Drizzle ORM.** Schema starts from the committed draft models in `packages/database/models` and is corrected during the first data-track PR:
  - embedding dimension is **1536** (OpenAI `text-embedding-3-small`), not 1024;
  - environment/config references are **OpenAI**, not Cohere/Anthropic.
- Tables: `standards` (catalogue record + lifecycle fields + `embedding vector(1536)` + team-written `summary`), `amendments`, `standard_edges` (typed relationship graph: `REFERS_TO`, `REFERENCED_BY`, `SUPERSEDED_BY`, `AMALGAMATES`, `PART_OF`, `EQUIVALENT_TO`, `AMENDED_BY`), `committees`, `departments`, `qcos`, `qco_obligations`, `harvest_runs`.
- `standards` carries a normalised designation key and a `tsvector` (or a generated FTS column) for lexical search; an **HNSW / cosine** index on `embedding`.
- `standard_edges.dst` may reference a standard not yet ingested — the raw target designation is always stored; the resolved foreign key is filled in by entity resolution when a match exists.

### tRPC API surface (frozen day 1 — PRD §Contracts)

- `standards.search` — input `{ query: string, limit?: number }` → list of catalogue matches (designation, title, `isStatus`).
- `standards.get` — input `{ number: string }` → one standard's full record + amendments + edges.
- `qco.checkStatus` — input `{ isNumber: string }` (and/or a product descriptor) → `{ status: "MANDATORY" | "VOLUNTARY" | "UPCOMING", qco?: { title, soNumbers, enforcementDate, scheme, sourceUrl } }`.
- `recommend.run` — input `{ specText: string, language?: "en" | "hi" }` → the full structured recommendation: ranked applicable standards, each with current-edition info, regulatory badge + QCO citation, allied standards tagged by role, evidence excerpt(s), gap warnings, draft clause; plus per-fact provenance (source dataset + `scrapedAt`).
- All I/O typed with Zod. The frontend builds against these types (mocked) until the endpoints land.

### The recommendation pipeline (behind `recommend.run`)

1. **Normalise / detect language.** For Hindi input, translate/normalise the query for retrieval; the reasoning and the response are produced in the requested language. Standard numbers/titles stay canonical.
2. **Embed** the (normalised) query with OpenAI `text-embedding-3-small`.
3. **Hybrid retrieve:** semantic search over `standards.embedding` (pgvector, cosine) + lexical search over the FTS column (Postgres `tsvector` / `ts_rank_cd`). Fuse the two ranked lists with **Reciprocal Rank Fusion**. Take the top ~15 candidates. **No dedicated reranker.**
4. **Assemble candidates** with their metadata and (for demo-slice standards) their cross-reference neighbours.
5. **LLM structured call** (`gpt-5-mini`): given the requirement and the ~15 candidates, produce ranking, per-candidate role classification, the evidence excerpts, the gap warnings, and the draft clause — **constrained so every standard number it emits is one of the supplied candidates**.
6. **Independent QCO check:** for each standard in the LLM's shortlist, query `qco_obligations` by normalised designation → set `MANDATORY` / `UPCOMING` / `VOLUNTARY` with citation. This overrides anything the LLM said about mandatory status.
7. **Version resolution:** for each shortlisted standard, use `isStatus` / `withdrawStatus` / `superseded_byis` / `validUpto` to attach the current edition, flag supersession, and note concurrent-running pairs.
8. **Post-hoc verification:** drop or flag any standard number in the output that does not exist in `standards` or does not trace back to a retrieved candidate.
9. **Response assembly:** compose the structured result with per-fact provenance.

### Domain services

- **Designation parser** (`packages/services/bis/designation.ts`, already drafted) — the single source of truth for turning any BIS designation string into a canonical key `(series, number, part, section, year)`. Used at ingest and at query time.
- **BIS API client** (`packages/services/bis/client.ts`, already drafted) — typed, throttled (~1–2 req/s), retrying-with-backoff client for the new-portal endpoints: `getWebsiteIndianStandardsList` (paginated, whole catalogue), `searchKnowStandards`, `getWebsiteStandardDetails`, `getCrossRefDetails`, `getAmendmentDetails`, `getwebsiteAllSectionalCommittees`. Zod schemas from real captured responses; permissive (nullish, passthrough) because the API is undocumented and unversioned.

### Data strategy (MVP)

- **(a)** Harvest the **full catalogue list** — `getWebsiteIndianStandardsList` paginated — giving ~24,145 rows of designation + title + committee + type + publish date. ~242 requests.
- **(b)** Harvest **full details + cross-references + amendments for ~15 named demo standards only** (across cement/concrete, structural steel, electronics/IT hardware, PPE/helmets, furniture).
- **(c)** **Hand-seeded QCO obligations** in a reviewed JSON data file for the demo domains, with real S.O. numbers and dates from the research doc: Furniture (QCO) 2025 — S.O. 801(E), enforcement 14 Feb 2026 (large) / 14 Aug 2026 (MSME); Cement (QCO) 2003 — S.O. 191(E); Steel and Steel Products (QCO) 2020 — S.O. 4637(E); Helmet for riders of Two Wheeler Motor Vehicles (QCO) 2020 — S.O. 4252(E).
- The **full Scheme I / II / IV / X + upcoming-QCO scraper** (with `rowspan` forward-fill) is a **P0 follow-up ticket after the working prototype**, not part of this spec's build.
- Embeddings are generated for the standards that have them (full catalogue title-level for search coverage; richer text for the demo slice).

### Demo domains

Cement/concrete · Structural steel · Electronics/IT hardware · PPE/helmets · Furniture.

### Deployment

`docker compose up` on a single AWS box (EC2/Lightsail). Full CI/CD to AWS is post-finale.

### Frontend

Next.js + shadcn/ui (already installed). One spec-input screen → one results view (ranked list, regulatory badge, version note, allied standards, evidence, gap warnings, draft clause). Builds against mocked tRPC types until the API lands.

### Copyright constraint

Store and display: standard numbers, titles, edition years, committees, lifecycle status, ISO/IEC equivalence, ICS, QCO/gazette text, and **team-written / paraphrased scope summaries**. **Never** store or render the body text, clauses, tables, or amendment text of an Indian Standard (BIS Act 2016 s.11). A `NOTICE` file credits BIS and ISO.

---

## Testing Decisions

**What makes a good test here:** it asserts observable behaviour — the shape and content of what `recommend.run` returns, or the canonical key `parseDesignation` produces — given controlled inputs. It does **not** assert internal call order, prompt strings, SQL, or how many times the LLM was invoked. A test that would break under a legitimate refactor of the pipeline internals is a bad test.

**Seam 1 — `recommend.run` (integration).** The single highest seam: it exercises normalisation → embedding → hybrid retrieval → candidate assembly → LLM structured call → independent QCO check → version resolution → verification → response assembly.
- Fixture: a test Postgres (the `pgvector/pgvector:pg16` container, or testcontainers) seeded with the ~15 demo standards and the hand-seeded QCO obligations.
- OpenAI is **mocked** with deterministic fixtures (embedding vectors and a canned structured completion) — no network, no spend, no flakiness.
- Assertions cover the demo scenarios: (1) "500 ergonomic office chairs" → recommends IS 17631:2022, badge `MANDATORY`, QCO citation present with S.O. 801(E) and the MSME enforcement date; (2) "RCC structural work per IS 456" → recommends IS 456:2000, badge `VOLUNTARY`, no ISI-mark language in the draft clause; (3, when built) "OPC 43 grade to IS 8112" → resolves to IS 269:2015, badge `MANDATORY`; (4, when built) the same requirement in Hindi returns a Hindi explanation with the same canonical citation.
- This test is the **template** for all future pipeline tests.

**Seam 2 — `parseDesignation` (pure unit).** A table of real messy inputs → expected canonical keys / structured fields: `"IS 456:2000"`, `"IS 456 : 2000"`, `"IS 1489 (Part 1) : 1991"`, `"IS 1489 : PART 1 : 1991"`, `"IS 516 (Part-5/Sec-1) : 2018"`, `"10322 (Part 5/Sec 1)"` (no prefix), `"IS/IEC 60947 : Part 5 : Sec 1 : 2024"`, `"IS/ISO 9001 : 2015"`, `"SP 6 : Part 7"`, `"IS 8112"` (no year), plus a couple of unparseable strings that must return null. This is the **template** for all pure-logic tests.

**Runner:** Vitest, per-package config, wired into the Turborepo `test` task. CI (GitHub Actions) runs `test` + `typecheck` + `lint` on every PR.

**Not unit-tested** (covered otherwise): the BIS client's HTTP behaviour (covered by the manual "Verify by" step against the live API in the harvester PRs); RRF fusion and QCO-match logic (exercised through the `recommend.run` seam); the harvester (verified by asserting row counts after a run).

**Prior art:** none — the codebase has no tests. These two seams establish the conventions.

---

## Out of Scope

For the MVP (finale prototype), explicitly excluded:

1. **User accounts, authentication, multi-tenant.** (The Google-OAuth scaffold stays in the template but is not wired into the product.)
2. **Offline / open-model ("sovereign") variant** — running with BGE-M3 + a local LLM. A P3 stretch only.
3. **Production CI/CD to AWS** — pipelines, IaC, multi-environment. The prototype deploys via `docker compose` on one box. Full CI/CD is a post-finale track.
4. **Live or scheduled BIS re-harvest** — cron, diff-based refresh, "what changed" views. Harvest once, freeze. The tiered auto-refresh design is a roadmap slide.
5. **Catalogue depth beyond the 5 demo domains** — full details/cross-refs are fetched only for the demo slice; the rest of the catalogue is title-level only.
6. **PDF full-text ingestion** — Docling, clause-2 extraction, reference sub-typing. Not in the MVP.
7. **Voice input.**
8. **The full Scheme I / II / IV / X + upcoming-QCO scraper** — a P0 follow-up *after* the working prototype; the MVP uses hand-seeded QCO data.
9. **A dedicated cross-encoder reranker** — P2, only if evaluation shows retrieval precision is the bottleneck.
10. **`pg_search` / ParadeDB BM25** — P2 upgrade over Postgres FTS if lexical recall measures weak.
11. **Automated evaluation harness and gold set** — P2 for the finale; not part of this spec's initial build.
12. **Tonight's noon milestone excludes scenarios 3 and 4 from the committed definition of done** — scenario 4 (Hindi) is attempted if it works with no extra effort; scenario 3 (supersession) is a stretch. Both are in scope for the finale (P1).

---

## Further Notes

### Priority levels

- **P0** — a demo scenario physically cannot run without it: schema + contracts, demo-slice + full-list harvest, hand-seeded QCO data, hybrid search, the pipeline, minimal UI, the independent QCO/mandatory-flag join, version resolution.
- **P1** — makes the demo convincing: cross-reference graph expansion, role classification, gap warnings, Hindi input, draft-clause output, supersession resolution (scenario 3).
- **P2** — breadth + rigour: full QCO scraper, all-5-domains depth, UI polish, evaluation harness, AWS deploy, reranker/`pg_search` if needed.
- **P3** — stretch: offline/open-model variant, additional languages.

Build strictly P0 → P1 → P2. A P1 ticket does not start while a P0 ticket is unclaimed.

### Milestones

- **M1 — tonight, noon deadline (college internal round, top-50 shortlisting):** scenarios 1 + 2 working end-to-end through the shared pipeline; data strategy (a)+(b)+(c); scenario 4 if Hindi is free, scenario 3 stretch. Everything else is carried by the deck.
- **M2:** all 5 domains, 4 scenarios, Hindi.
- **M3:** evaluation numbers frozen, polish, demo script, deployed on AWS.

### Team & process

- **Sourav** — tech lead, final decision-maker, PRD owner, PR approver. Backend + AI + integration.
- **Shaurya** — data scraping/harvest + DevOps (Track: data/infra).
- **Charu** — frontend UI only (Track: app/web).
- **Rupesh + one of Abhinav/Aditya** — deck + live API demo.
- **Remaining member** — runner: env setup, seed data, testing, logging failures.
- Tickets: **GitHub Issues** + Projects board (Backlog / Ready / In progress / In review / Done). Labels: `track:data` `track:app` `track:web` `track:infra` `track:deck`, `P0`–`P3`, `ready-for-agent`.
- **PR flow from the start** (including tonight): feature branch → PR → **CodeRabbit** automated review → significant findings resolved or justified → **1 human approval** → merge. `main` protected.
- **Ticket = one PR = ≤ half a day.** Body: *Context → Acceptance criteria → Verify by → Depends on*.
- **Definition of Done:** tests + typecheck + lint green · the "Verify by" step performed with evidence pasted in the PR · CodeRabbit review clear · 1 human approval.
- **Two blockers to clear before the first PR:** (i) CodeRabbit must be installed on the repo; (ii) a second approver must be available for 3am PRs (Sourav cannot self-merge on protected `main`) — nominate Shaurya, or grant Sourav admin-bypass for P0 tickets tonight only.

### Data-source caveat

The BIS new-portal API (`standardsadmin.bis.gov.in`) is undocumented, unauthenticated, unversioned, and CORS-open. Verified working 2026-09-10. Treat it as scraping: cache aggressively, stamp every row with `scrapedAt`, keep the schemas permissive. If it is locked down mid-project, the frozen snapshot keeps the demo alive.
