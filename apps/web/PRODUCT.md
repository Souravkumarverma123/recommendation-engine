# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (Turbopack, App Router), React, Tailwind CSS v4, shadcn/ui ("new-york" style) + Aceternity UI registry, tRPC (`@repo/trpc`) inside a Turborepo monorepo.

## Users

Primary user: an Indian government procurement officer drafting a tender for goods or works, under the General Financial Rules and the Manual for Procurement of Goods. They are not a standards specialist — they need to (1) identify every applicable Indian Standard for what they're buying, (2) confirm it's the current, non-withdrawn edition, and (3) determine whether BIS certification is legally mandatory (a Quality Control Order) or merely voluntary. Today this is done by hand against the BIS catalogue and scattered gazette PDFs; it takes days and mistakes are audit findings or grounds for a tender to be legally challenged.

Secondary audience for this specific landing page: SIH 2026 hackathon judges/evaluators assessing the submission. The page should read as a credible, shippable product to an officer while also standing up to evaluator scrutiny — no hackathon-specific language, but polish and clarity that demonstrates depth.

## Product Purpose

A web app where the officer pastes a procurement requirement (product description, spec, or tender clause — English or Hindi) and gets back a ranked list of applicable Indian Standards, each with: current edition (with supersession note), a regulatory badge (MANDATORY / UPCOMING / VOLUNTARY / NEEDS_REVIEW) with QCO citation when applicable, allied standards by role, evidence excerpts from the officer's own input, gap warnings on the draft spec, and ready-to-paste tender clause language. Success = the officer can defend every citation in file notes and to an auditor, and never pastes a withdrawn, hallucinated, or wrongly-certified standard into a tender.

## Positioning

The regulatory/QCO check is an **independent, always-run check against the QCO layer**, never inferred from the fact that a standard was found. "No QCO found" is a verified positive result, not silence. This is the mechanism competitors (the BIS portal itself, or a naive "search + guess mandatory" tool) cannot truthfully claim: BIS lets you search the catalogue; it does not tell you which standards apply to your spec or whether compliance is mandatory, and the two example failure modes in `docs/demo-flow.md` (citing IS 8112 after it was withdrawn and superseded by IS 269:2015; requiring an ISI mark for IS 456 which has none) are both GFR Rule 144 / audit-finding traps a naive system would walk straight into.

## Operating Context

- Officer works from a draft tender clause or bare product description, often terse, sometimes in Hindi.
- Output must be citable directly in file notes/tender documents — designations and titles are kept in canonical form regardless of query language.
- The system separates authoritative facts (from a structured DB harvested from BIS: standard number, title, edition, lifecycle, supersession, QCO applicability, enforcement date) from AI reasoning (understanding the request, ranking, explaining, drafting). The LLM proposes; the data layer validates and overrides — it is structurally unable to invent a standard number or misreport a QCO.
- Pipeline (for messaging/diagramming purposes): hybrid retrieval (lexical + semantic, fused via RRF) → version resolution → independent QCO check per candidate → LLM reasoning (ranking, role classification, evidence, gap warnings, draft clause, concise answer) → post-hoc verification that the model didn't cite outside the verified candidate set → assembled response.

## Capabilities and Constraints

- Bilingual: English and Hindi input and output; standard designations/titles always stay canonical.
- Regulatory badges: MANDATORY, UPCOMING, VOLUNTARY, NEEDS_REVIEW — NEEDS_REVIEW means a possible scope-based "horizontal" QCO that can't be resolved automatically.
- Allied standards are tagged by role: normative reference, test method, safety, terminology, installation.
- Gap warnings cover: superseded citation, brand name (GFR Rule 144), foreign/ISO standard where an Indian equivalent exists, non-metric units, missing parameter.
- Every standard number shown must exist in the harvested BIS catalogue — never a hallucinated citation.
- Working name for the product on this landing page: **Manak** (मानक — Hindi for "standard"); not a registered brand, may be swapped later.

## Brand Commitments

No existing visual identity, logo, or locked brand voice. "Manak" is a placeholder working name, confirmed usable for this build but not a durable commitment.

## Evidence on Hand

Real, citable facts from `docs/PRD.md` and `docs/demo-flow.md`, approved for use as on-page content/examples:

- Scale: 187 QCOs covering ~769 products (regulatory layer).
- Demo scenario 1 (mandatory): "500 ergonomic office chairs" → IS 17631:2022 ("Work chairs") → Furniture (QCO) 2025, S.O. 801(E), 13 Feb 2025, ISI mark under Scheme I, MSME enforcement 14 Aug 2026.
- Demo scenario 2 (voluntary): "RCC structural work per IS 456" → IS 456:2000 (current, Reaffirmed 2021) → no QCO exists, clause must NOT require an ISI mark.
- Demo scenario 3 (supersession trap): "OPC 43 grade to IS 8112" → IS 8112 withdrawn → resolves to IS 269:2015 → mandatory under the Cement QCO 2003.
- Demo scenario 4 (Hindi): "मोटरसाइकिल हेलमेट के लिए मानक" → IS 4151:2015, mandatory since Nov 2020, answered in Hindi.
- No real customer testimonials, logos, press, or usage metrics exist — do not fabricate any.

## Product Principles

1. Authoritative facts and AI reasoning are visibly separate — the page's own language should reflect "the model proposes, the data layer decides," not blur into a generic "AI-powered" pitch.
2. Every claim of trustworthiness must be backed by a real mechanism (independent QCO check, post-hoc citation verification, version resolution) — no unearned trust language.
3. Officer-first clarity: plain-language explanation of what the tool does beats cleverness; a government user skimming for 30 seconds must understand the value.
4. Concrete over abstract: use the real demo scenarios and numbers rather than generic SaaS claims ("save time," "AI-powered insights").
5. Bilingual is a first-class capability, not a footnote — it should be visible in the page's proof, not just mentioned in a bullet.

## Accessibility & Inclusion

No specific standard confirmed beyond general web accessibility good practice (the primary user is a government officer, so WCAG-reasonable contrast/semantics/keyboard access should be treated as a default expectation, not skipped for visual boldness).
