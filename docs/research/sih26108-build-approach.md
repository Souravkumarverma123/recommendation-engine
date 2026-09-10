# SIH26108 — Build Approach (techniques, stack, prior art)

> Companion to `sih26108-bis-ecosystem-data-archaeology.md` (which covers the BIS data reality).
> This doc = **decisions for building the thing**. Kept short on purpose. Date: 2026-09-10.

---

## 1. Prior art — is anyone already doing this?

**No existing tool does procurement-spec → Indian-Standard recommendation.** Confirmed gap. Good for the pitch.

| Category | Examples | What they actually do | Relevance |
|---|---|---|---|
| Standards **search** portals | ISO OBP, BIS portal, ASTM Compass, iTeh | keyword/catalogue search, no "given my spec, what applies" | we go beyond this |
| **Standards-intelligence** / regulatory-change tools | Nimonik, Compliance.ai, Enhesa, Assent | track *changes* to regs a company already knows apply to it; subscription | adjacent, not the same problem |
| **Automated Building Code Compliance Checking (ACC)** — academic field | ~20 yrs of research, mostly construction | parse a code → check a BIM model against it | **closest research analog — mine this** |

**Key lessons from the ACC literature** ([review, 2026](https://www.sciencedirect.com/science/article/pii/S0926580526001007); [LLM-driven ACC, arXiv 2506.20551](https://arxiv.org/pdf/2506.20551)):
- Four architectural strategies exist: rule-based, ontology/graph, ML, LLM/NLP. The field has **shifted to transformer/LLM** for clause interpretation and semantic alignment since ~2023.
- **Full automation has limited coverage.** The hard part is *exceptions and conditional clauses* ("applies unless rating > 630 A", "except test in Annex J"). This is exactly our Scheme X rating-conditions and horizontal-QCO problem — so scope the demo to the clean cases and *flag* the conditional ones for human review, don't pretend to resolve them.
- Method to borrow: frame it as **retrieval + multi-label classification + citation-graph expansion**, not pure generation.

**Benchmarks** (for eval methodology, not direct reuse): FIRE **AILA** (Indian legal statute/case retrieval), COLIEE (legal IR competition). No standards-recommendation benchmark exists — we build a small gold set (see §2).

---

## 2. AI / Retrieval layer

### The pipeline (this is the 2026 standard shape for citation RAG)
```
query → normalise/translate → hybrid retrieve (dense top-50 + BM25 top-50, RRF-fused)
      → rerank (cross-encoder, keep top 5–10)
      → LLM with STRUCTURED OUTPUT (must cite candidate IDs)
      → post-hoc verification (every IS number exists in catalogue + traces to a retrieved candidate)
      → data layer overlays status / QCO flag / version   ← never from the LLM
```
Sources: [RAG best practices 2026](https://www.callmissed.com/en/blog/rag-best-practices-2026), [citation-aware RAG](https://www.tensorlake.ai/blog/rag-citations).

### What's being retrieved
Mostly **~25k short structured records** (standard metadata rows), *plus* ~500 chunked PDFs for the demo-slice full text. So: hybrid search over records + a small vector index. Not a big-corpus RAG problem.

### Decisions
| Choice | Pick | Why |
|---|---|---|
| **Embedding model** | **BGE-M3** (open, free, 8k ctx) | multilingual incl. Indian languages → also solves §5; emits **dense + sparse in one model** so hybrid is free; small team, one dependency. (Jina v3 slightly better on multilingual MTEB — fine alternative.) |
| **Lexical search** | BM25 (Postgres FTS or OpenSearch) | catches exact IS numbers / product terms embeddings miss |
| **Reranker** | BGE-reranker-v2 (open) or Cohere Rerank 3.5 (API, cheap, better) | biggest single quality lever after hybrid |
| **Grounding** | **constrained/structured output** — LLM may only emit IS numbers from the retrieved candidate set (JSON-schema / tool-calling; grammar-constrained decoding if self-hosting) | this is a citation system — a hallucinated IS number is a demo-killer |
| **LLM** | API model for the pipeline (Claude Sonnet/Haiku or Gemini Flash). Also demo an open model (Qwen3 / Llama / **Sarvam-M**) for the "sovereign / on-prem" story judges like | |
| **Orchestration** | plain Python + thin glue (LangGraph *or* just functions) | don't over-engineer a 6-step pipeline |
| **Role typing** (applicable / normative / test-method / safety / terminology) | graph-edge lookup where the API gives it; LLM classifier over the candidate set otherwise | |

### Evaluation (judges will probe this)
- Build a **gold set of ~50–100 real tender clauses** with known-correct IS numbers. Source: archived CPPP / GeM tenders + **QCO tables as distant supervision** (a "two-wheeler helmet" tender must surface IS 4151).
- Metrics: **Recall@5, MRR**, and **mandatory-flag accuracy** (did we correctly say QCO-mandatory vs voluntary).
- Explanation quality: LLM-as-judge with a rubric + human spot-check.

---

## 3. Knowledge graph — build & store

**The graph is small: ~25k nodes, ~150–250k edges, traversals are 1–3 hops.** This does **not** need Neo4j.

| Decision | Pick | Why |
|---|---|---|
| **Store** | **PostgreSQL** — entities in normal tables, relationships in one `edges(src, dst, type, props)` table, **recursive CTEs** for supersession chains + reference neighbourhoods; **pgvector** for embeddings | one database, zero ops, shallow traversals. Neo4j only buys nicer syntax at this scale and costs you a second system. |
| (if the team wants a graph DB for optics) | **KùzuDB** — embedded, no server, Cypher | lighter than Neo4j; still probably unnecessary |
| **Schema vocabulary** | **NISO STS** (Standards Tag Suite) | BIS is adopting it (the XML-conversion RFP) — align now, ingest their XML later for free |
| **Versioning model** | **FRBR** (Work = "IS 456", Expression = edition "IS 456:2000") + **ELI** amendment/consolidation pattern | clean way to model reprints, amendments, concurrent editions |
| **Entity resolution** ("IS 8112" → node) | regex/grammar parser for designation strings + BIS `searchKnowStandards` / `getData.php` as ground truth + fuzzy fallback | mostly rules, not ML — don't over-invest |

Edge types to populate (all from the BIS API per the data-archaeology doc): `REFERS_TO`, `REFERENCED_BY`, `SUPERSEDED_BY`, `AMALGAMATES`, `AMENDED_BY`, `PART_OF`, `EQUIVALENT_TO`, `BELONGS_TO` (committee), `MANDATED_BY` (QCO), `CLASSIFIED_UNDER` (group taxonomy).

**GraphRAG frameworks (Microsoft GraphRAG, LightRAG) are overkill** — those extract graphs *from unstructured text*. Ours comes pre-built from the API.

---

## 4. Documents — extraction (demo-slice only)

Only needed for ~300–500 full-text PDFs (4–5 demo domains). Everything else is API metadata.

| Decision | Pick |
|---|---|
| **PDF → structure** | **Docling** (IBM, open, free) — ~98% table accuracy, preserves clause hierarchy. Marker if GPU budget + max fidelity wanted. |
| **Old scanned standards** | `law.resource.org` **already has OCR text** for pre-2018 — use it; re-OCR only if bad |
| **What to extract** | clause 1 Scope (→ your paraphrased summaries), clause 2 References (→ sub-type the cross-ref edges), clause 3 Terminology, test-method clauses ("tested in accordance with IS xxxx"). Regex + LLM extraction on Docling output. |
| **Chunking** | by clause (respect the numbered hierarchy), not fixed windows |

**Copyright:** extraction for internal processing is fine; you store derived facts + your own summaries, **never the clause text** (BIS Act s.11 — see data-archaeology doc §12).

---

## 5. Multilingual

**Reality check: Indian government procurement documentation is predominantly English** (CPPP, GeM, central tenders). IS numbers and most standard titles are English regardless of query language. So multilingual is a **query-side feature**, not a corpus problem.

| Decision | Pick | Why |
|---|---|---|
| **Pattern** | **Hybrid** — normalise/translate query → English for retrieval (IS numbers/titles are language-invariant anchors); LLM reasons and answers in the user's language | BGE-M3 also does cross-lingual retrieval natively, so translation is optional for the retrieval step |
| **Languages for the demo** | **Hindi + English + 2 regional** (Marathi / Tamil / Bengali — pick by team familiarity) | credible without overreach |
| **Code-mixed / Romanised** ("cement ka IS code kya hai") | must handle it — this is what officials actually type. Language-ID + IndicTrans2 or an LLM normalises | |
| **Translation** | **IndicTrans2** (AI4Bharat, open, 22 languages, free). **Bhashini / ULCA APIs** (MeitY) as the "national language stack" story — but needs registration, don't hard-depend on it for the demo | |
| **Generation/extraction in Hindi** | a general LLM (Claude / Gemini) is good enough for a prototype; Sarvam-M as the Indic-native option | |

**Biggest risk:** MT mangling technical terms ("deformed bars" → literal nonsense). **Mitigation:** pin a glossary of standard technical terms; anchor on IS numbers, not translated prose.

---

## 6. What to build — component checklist

**Data layer (~60% of effort, mostly invisible)**
1. Harvester — BIS new-portal API (catalogue + details + cross-refs + committees), the 4 QCO HTML tables (rowspan-safe), legacy withdrawal/reaffirmation lists, FMCS list. Snapshots with `scraped_at`.
2. Normaliser — messy designation strings → canonical `(series, number, part, section, year)`.
3. Postgres schema — entities + `edges` table + pgvector; NISO-STS-aligned vocabulary.
4. Supersession + QCO graph — machine-built, hand-verified for the demo slice.
5. Doc pipeline (demo slice) — Docling → extract clauses → chunk → embed.

**AI layer (~40%, demo-visible)**
6. Query parser (spec → structured params) + terminology expander + language normaliser.
7. Hybrid retriever (BGE-M3 dense + BM25, RRF) + reranker.
8. Role classifier (applicable / normative / test-method / safety / terminology).
9. Version resolver + mandatory-flag joiner — **pure data layer, runs after retrieval**.
10. Explanation + gap-warning generator ("⚠ you cited IS 8112, superseded by IS 269:2015").
11. UI — paste spec → ranked list with version badge, mandatory/voluntary/upcoming chip, QCO citation, evidence excerpt, draft clause. Multilingual input.

**Ops**
12. Scheduled re-harvest + diff-based QA. Gazette monitoring stays manual.

---

## 7. What NOT to over-invest in

- A graph database (Postgres is enough).
- GraphRAG frameworks (graph is pre-built).
- Fine-tuning embeddings (BGE-M3 off-the-shelf is fine for a prototype).
- Corpus-wide PDF extraction (demo slice only).
- Full multilingual corpus (corpus is English; multilingual is query-side).
- Resolving conditional/horizontal QCOs automatically (flag for human review).
- Bhashini as a hard dependency (nice story, slow to get access).

---

## Sources
- ACC review 2026 — https://www.sciencedirect.com/science/article/pii/S0926580526001007
- LLM-driven code compliance checking (BIM) — https://arxiv.org/pdf/2506.20551
- RAG best practices 2026 — https://www.callmissed.com/en/blog/rag-best-practices-2026
- Citation-aware RAG — https://www.tensorlake.ai/blog/rag-citations
- BGE-M3 paper — https://arxiv.org/html/2402.03216v3
- BGE-M3 vs Jina v3 — https://learn.engineering.vips.edu/compare/bge-m3-vs-jina-embeddings-v3
- Hindi retrieval benchmark (Hindi-BEIR, NLLB-E5) — https://arxiv.org/pdf/2409.05401
- Docling / Marker / Unstructured table benchmark — https://codecut.ai/docling-vs-marker-vs-llamaparse/
- PDF parsers 2026 — https://www.firecrawl.dev/blog/best-pdf-parsers
- Postgres vs Neo4j — https://www.puppygraph.com/learn/postgres-vs-neo4j
- IndicTrans2 — https://github.com/AI4Bharat/IndicTrans2
- Bhashini — https://en.wikipedia.org/wiki/Bhashini
- SIH 2026 problem statements — https://github.com/NoBugNinja/Smart-India-Hackathon-SIH-2026-Problem-Statements
