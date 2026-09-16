# SIH26108 — Project Plan

> Companion to `docs/research/sih26108-bis-ecosystem-data-archaeology.md` (data reality) and
> `docs/research/sih26108-build-approach.md` (stack + flow).
> Date: 2026-09-10. **Assumes ~5-person team, ~3 weeks to Sep 30.** Adjust tracks if different.

---

## Locked scope

| | Decision |
|---|---|
| **Demo domains** | Cement/concrete · Structural steel · Electronics/IT hardware · PPE/helmets · Furniture |
| **Voluntary demonstration** | comes from **codes of practice** (IS 456, IS 800) inside cement/steel — NOT a separate domain. (Furniture went mandatory: Furniture QCO 2025, S.O. 801(E), enforcement 14 Feb / 14 Aug 2026.) |
| **Languages** | Hindi + English |
| **Data** | BIS new-portal JSON API (verified live 2026-09-10) + QCO HTML tables + legacy lifecycle lists |
| **What ships** | Citation-and-status engine: metadata + own summaries + QCO text. **No standard body text.** |

## Stack (locked)

- **Monorepo** (pnpm workspaces): `apps/web` (Next.js + tRPC + AI SDK), `apps/harvester`, `packages/db` (Drizzle), `packages/core` (BIS client + domain logic)
- **DB**: Postgres + pgvector (Supabase or Neon)
- **Embeddings + reranker**: Cohere embed v4 + Rerank 3.5 (TS SDK)
- **LLM**: Claude Sonnet (reasoning) + Haiku (cheap steps), via Vercel AI SDK
- **PDF**: Docling (throwaway Python batch / `docling-serve` container) — offline only
- **Translation**: Claude/Gemini in v1
- **Hosting**: two Docker containers (`api`, `web`) behind Caddy on a single EC2 box, DB on Neon — see `docs/PRD.md` §Deployment

---

## Tracks (parallel ownership)

| Track | Owner(s) | Scope |
|---|---|---|
| **A — Data / Ingestion** | 1–2 | harvester (BIS API + QCO tables, rowspan-safe), designation normaliser, Postgres schema, supersession + QCO graph builder, snapshot/diff |
| **B — Retrieval / AI** | 1–2 | pgvector + hybrid search, reranker, the 7-step pipeline, prompts, structured output, post-hoc verification, role classifier |
| **C — Frontend / UX** | 1 | Next.js UI, spec input (Hindi/English), ranked-results view, version badge + QCO chip, gap-warnings panel, draft-clause output |
| **D — Eval / Demo / Docs** | 1 (often lead) | gold set (~50–100 tender clauses), eval harness, demo script, pitch deck, "production roadmap" slides |

`packages/core` is shared by A and B — one source of truth for "how we parse and resolve a standard reference."

---

## Phases

### Phase 0 — Scaffold + spike (Days 1–2)
**Goal: dumbest possible thing works end-to-end, deployed.**
- [ ] Monorepo scaffolded (`create-t3-turbo` or by hand)
- [ ] Postgres provisioned, `packages/db` schema v0 (`standards`, `editions`, `edges`, `qco_obligation`)
- [ ] `apps/harvester`: pull the full 24k *list* → Postgres (242 calls, ~2 min)
- [ ] `apps/web`: one input box → embed query (Cohere) → pgvector search over the 24k titles → top 5 raw results
- [ ] Deployed to Vercel
**Exit criteria:** type "helmet for two wheeler riders" → get IS 4151 in the top 5.

### Phase 1 — One domain, done well (Days 3–8)
**Goal: cement/concrete works end-to-end with real quality.**
- [ ] A: eager-harvest cement committee (CED 2) details + cross-refs + amendments; parse Cement QCO from Scheme I; build supersession edges (incl. IS 8112/12269 → IS 269:2015)
- [ ] B: hybrid search (dense + BM25 + RRF) → Cohere rerank → Claude ranking + explanation with **structured output** (may only cite retrieved candidates) → **post-hoc verification** (IS number exists + traces to candidate)
- [ ] B: version resolver (data layer) + mandatory-flag joiner (data layer)
- [ ] C: results view — ranked list, version badge, mandatory/voluntary chip, evidence excerpt, one gap-warning
- [ ] D: 15–20 cement tender clauses as the first eval slice
**Exit criteria:** paste a real cement tender clause → correct current IS, correct mandatory flag, correct "you cited IS 8112 → superseded by IS 269:2015" warning.

### Phase 2 — Widen + hard features (Days 9–15)
**Goal: all 5 domains + the features that impress.**
- [ ] A: eager-harvest the other 4 domains' committees; parse Steel / Electronics (CRS) / Helmet / **Furniture (S.O. 801(E), phased dates)** QCOs; tag IS 456 / IS 800 as codes-of-practice with no QCO (the voluntary examples); lazy-cache anything outside the slice
- [ ] A: Docling batch over ~300–500 demo-slice PDFs (law.resource.org) → clause 1/2/3 + test-method lines
- [x] B: **graph expansion** (walk REFERS_TO / PART_OF from candidates → allied/normative/test-method) — ticket #11
- [x] B: **role classifier** (normative / test-method / safety / terminology / installation) — ticket #11
- [ ] B: **Hindi input** — detect + normalise/translate query → English for retrieval; answer in Hindi
- [ ] B: concurrent-running + upcoming-QCO handling
- [ ] C: multilingual UI, gap-warnings panel (brand names, foreign-standard-where-IS-exists, non-metric units), draft tender clause
- [ ] D: full gold set (~80–100 clauses across 5 domains); Recall@5 / MRR / mandatory-flag accuracy
**Exit criteria:** all 5 domains answerable; Hindi query works; graph pulls in companions; eval numbers recorded.

### Phase 3 — Eval + polish + demo (Days 16–19)
- [ ] D: run eval, tighten prompts against failures, freeze numbers for the deck
- [ ] C: UI polish, empty/error states, loading, mobile-ok
- [ ] B: (stretch) sovereign/offline variant — BGE-M3 container + open LLM (Ollama)
- [ ] D: demo script (3–4 scripted scenarios: 1 mandatory, 1 voluntary, 1 supersession-trap, 1 Hindi), pitch deck, production-roadmap slides
- [ ] A: final re-harvest so demo data is fresh; snapshot frozen

### Phase 4 — Buffer + dry runs (Days 20–21)
- [ ] 2+ full dry runs of the demo
- [ ] Fix whatever breaks
- [ ] Submission assets (video, repo README, NOTICE file crediting BIS/ISO)

---

## Demo script (target — 4 scenarios; see `docs/demo-flow.md` for diagrams)

Every scenario is a case where the obvious approach fails.

1. **Recently mandatory (furniture):** "500 ergonomic office chairs" → IS 17631:2022, **mandatory** under **Furniture QCO 2025 (S.O. 801(E))**, ISI mark, **MSME enforcement 14 Aug 2026**. Naive approach misses that it became compulsory this year.
2. **Voluntary / code of practice (concrete):** "RCC structural work per IS 456" → IS 456:2000 applies (current, Reaffirmed 2021), **not QCO-mandatory, cannot carry an ISI mark** → clause = "shall conform to IS 456:2000", *not* "bear the ISI mark". Naive approach over-specifies (restrictive spec, GFR Rule 144).
3. **Supersession trap (cement):** "OPC 43 grade to IS 8112" → IS 8112 **withdrawn** → **IS 269:2015** → which **is** mandatory (Cement QCO 2003). Naive approach string-matches a dead standard.
4. **Hindi (helmet):** "मोटरसाइकिल हेलमेट के लिए मानक" → IS 4151:2015, mandatory since 26 Nov 2020, answered in Hindi.

**The architectural claim these prove:** the system runs an *independent* regulatory/QCO query for the product — it never infers "mandatory" from the existence of a standard. "No QCO found" (scenario 2) is a verified result, not a default.

---

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| BIS API locked down mid-project | You have a frozen snapshot from day 1; harvest early, keep snapshots |
| Retrieval quality poor on real tender language | Phase 1 is a full quality loop on *one* domain before widening; eval set from real tenders |
| Hindi MT mangles technical terms | Pin a technical-term glossary; anchor on IS numbers not prose; keep Hindi to query-side |
| Scope creep (more domains/languages) | 5 domains / 2 languages is locked — new asks go to "roadmap" slide |
| Over-building infra (cron, graph DB, monorepo tooling) | Manual harvest runs; Postgres not Neo4j; 2 apps + 2 packages max |
| Copyright slip (showing standard text) | Hard rule in code review: UI renders metadata + own summaries + QCO text only |

---

## Start-here checklist (today)

- [ ] Decide furniture confirmed (verify no QCO)
- [ ] Create the repo, invite the team, assign tracks
- [ ] Provision Postgres (Supabase/Neon), get Cohere + Anthropic API keys
- [ ] Collect 10 real tender specs (CPPP/GeM) across the 5 domains
- [ ] Phase 0 kickoff
