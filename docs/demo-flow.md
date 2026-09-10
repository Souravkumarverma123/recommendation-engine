# SIH26108 — Demo Flow (for the presentation)

The core visual: **two independent branches — Standard Search and Regulatory/QCO Search — that run in parallel and converge.** The regulatory branch always runs and always returns a *verified* result, including "no QCO found". The system never infers "mandatory" from the existence of a standard.

---

## Mandatory case — office chairs

```mermaid
flowchart TD
    R["PROCUREMENT REQUEST<br/>'500 ergonomic office chairs'"]
    R --> EX["Requirement Extraction (LLM)<br/>product: work chair · ergonomic, swivel, adjustable"]

    EX --> SS["① Standard Search<br/>hybrid retrieval + graph expansion"]
    EX --> RS["② Regulatory / QCO Search<br/>QCO tables + gazette lookup<br/>— independent, always runs —"]

    SS --> SR["IS 17631:2022 — 'Work chairs'<br/>+ allied: IS 17636, test-method standards"]
    RS --> RR["Furniture (QCO) 2025<br/>S.O. 801(E), 13 Feb 2025<br/>obligation: ISI mark (Scheme I)<br/>enforcement: 14 Aug 2026 (MSME)"]

    SR --> M["Merge + Version Resolve + Verify<br/>(data layer — IS 17631 current? not superseded? ✓)"]
    RR --> M

    M --> F1["Applicable Standard<br/>IS 17631:2022 (current)"]
    M --> F2["Regulatory Status<br/>⚠️ MANDATORY — ISI mark<br/>from 14 Aug 2026 · S.O. 801(E)"]
    M --> F3["Draft tender clause<br/>'…shall conform to IS 17631:2022 and bear the<br/>Standard Mark (ISI) under BIS licence…'"]
```

## Voluntary case — concrete code of practice

```mermaid
flowchart TD
    R2["PROCUREMENT REQUEST<br/>'RCC structural work per IS 456'"]
    R2 --> EX2["Requirement Extraction<br/>product: reinforced-concrete construction"]

    EX2 --> SS2["① Standard Search"]
    EX2 --> RS2["② Regulatory / QCO Search"]

    SS2 --> SR2["IS 456:2000 — 'Plain and Reinforced Concrete:<br/>Code of Practice' (current, Reaffirmed 2021)"]
    RS2 --> RR2["No QCO found ✓ (checked, not assumed)<br/>IS 456 is a design code — no ISI mark exists for it"]

    SR2 --> M2["Merge + Verify"]
    RR2 --> M2

    M2 --> G1["Applicable Standard<br/>IS 456:2000 (current)"]
    M2 --> G2["Regulatory Status<br/>NOT mandatory · cannot carry an ISI mark"]
    M2 --> G3["Draft tender clause<br/>'…shall conform to IS 456:2000…'<br/>— NOT '…bear the ISI mark…'"]
```

---

## Why this is the pitch

| | Naive system ("found a standard → require ISI mark") | This system |
|---|---|---|
| Office chairs | ⚠️ mandatory (right by luck) | ⚠️ mandatory — with S.O. number + enforcement date |
| RCC / IS 456 | "shall bear ISI mark" ❌ **restrictive spec — GFR Rule 144 violation** | "shall conform to IS 456" ✅ |
| OPC 43 grade / IS 8112 | "not in QCO list → voluntary" ❌ | IS 8112 withdrawn → IS 269:2015 → mandatory ✅ |

The regulatory branch is a **separate query against the QCO layer for the product**, not a property read off the standard. "No QCO found" is a verified finding.

## Full demo set (4 scenarios)

1. **Recently mandatory** — furniture / IS 17631 → Furniture QCO 2025, MSME deadline 14 Aug 2026.
2. **Voluntary / code of practice** — RCC / IS 456 → applies, not mandatory, no ISI mark.
3. **Supersession trap** — "OPC 43 grade to IS 8112" → withdrawn → IS 269:2015 → mandatory (Cement QCO 2003).
4. **Hindi** — "मोटरसाइकिल हेलमेट के लिए मानक" → IS 4151:2015, mandatory since Nov 2020, answered in Hindi.

Every scenario is a case where the obvious approach fails.

**Sources:** Furniture QCO 2025 — https://furnituredesignindia.com/articles/90910/govt-announces-mandatory-qco-bis-on-furniture-w-e-f-13th-feb-2026 · rest per `docs/research/sih26108-bis-ecosystem-data-archaeology.md`.
