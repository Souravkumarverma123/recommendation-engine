---
name: Manak
description: Indian Standards Recommendation Engine for procurement officers — cite the right standard, every time.
colors:
  ink: "#111111"
  body: "#374151"
  muted-ink: "#6b7280"
  canvas: "#ffffff"
  canvas-soft: "#f8f9fa"
  surface-card: "#f5f5f5"
  surface-strong: "#e5e7eb"
  hairline: "#e5e7eb"
  hairline-soft: "#f3f4f6"
  hairline-strong: "#d1d5db"
  primary: "#111111"
  primary-active: "#242424"
  primary-disabled: "#d1d5db"
  brand-accent: "#3b82f6"
  destructive: "#ef4444"
  success: "#10b981"
  warning: "#f59e0b"
  surface-card-dark: "#101010"
  surface-elevated-dark: "#1a1a1a"
typography:
  display:
    fontFamily: "var(--font-inter), Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.375rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "var(--font-inter), Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.125rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "var(--font-inter), Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "var(--font-inter), Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.84375rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.02em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "80px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-active}"
  button-on-hero:
    backgroundColor: "{colors.canvas}"
    textColor: "#0369a1"
    rounded: "{rounded.pill}"
    padding: "10px 24px"
  button-ghost-on-hero:
    backgroundColor: "rgba(255,255,255,0.1)"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: "10px 24px"
  badge-mandatory:
    backgroundColor: "{colors.destructive}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  badge-upcoming:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  badge-voluntary:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  badge-needs-review:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "8px"
---

# Design System: Manak

## Overview

**Creative North Star: "Cal.com-light, proven mid-air."**

Manak is a government-adjacent utility with one moment of spectacle: a full-bleed WebGL sky at the top of the page, and nothing else that competes with it. Everywhere outside that sky, the system is the quiet, professional "Cal.com-light" world already committed in `app/globals.css` and reused verbatim on `/dashboard` — white canvas, near-black ink, hairline borders, and a single saturated blue reserved for the sky and for interactive/regulatory emphasis. The landing page does not invent a second visual language for itself; it borrows the dashboard's tokens and spends its one allowed flourish on proving the product's structural claim (the regulatory check is independent, not inferred) through a two-branch diagram rather than through decorative badges or stat tiles.

Density is generous but not loose: sections run 80–112px of vertical padding on desktop, content is capped at `max-w-5xl` (or `max-w-3xl` for FAQ), and every section opens with a left-aligned headline-plus-subhead pair capped at `max-w-2xl` before widening into its content. The page never uses a full-width hero claim followed by full-width proof — proof is always narrower than the viewport, which reads as restraint rather than a marketing wall.

Confirmed visual rejections: no drop shadows on flat cards (only `card-hover`'s subtle lift on interaction), no gradient buttons, no generic "AI sparkle" trust badges without a citable mechanism behind them, no stock photography or illustration — every visual proof point is either real data (demo scenarios, the 187/769 counts) or the CloudShader.

**Key Characteristics:**
- One saturated accent (`#3b82f6` / sky-700 text) used only for the hero/CTA sky plate and interactive emphasis — everything else is ink-on-white or ink-on-hairline-gray.
- Pill-shaped badges/buttons for status and action; rounded-2xl (20px) cards for content containers.
- The `--ink` (`#111111`) surface is a recurring "verified fact" plate — used for the merge step, the regulatory-count tile, and the current-edition tile.
- Scroll-triggered `.reveal` fade-up on every section past the hero; the hero itself uses a one-time staggered entrance sequence.

## Colors

The palette is almost monochrome by design — white canvas, near-black ink, and gray hairlines — with one saturated blue held in reserve for the sky and for signaling "this is live/interactive."

### Primary
- **Cal Black** (`#111111`, token `--ink` / `--primary`): primary text color, primary button background/foreground on white surfaces (`bg-primary` in the dashboard composer), and as a "verified fact" plate background (the mechanism section's merge step, the regulatory-coverage tile, the current-edition-confirmed tile) rendered in white-on-black.

### Secondary
- **Sky Blue** (`#3b82f6`, token `--info` / `--brand-accent`): the CloudShader's sky gradient (rendered via inline hex props `#2f6ba8`→`#8cbfe8` on the hero, `#245b91`→`#6fa8d8` on the CTA band, not the token directly, since WebGL needs literal hex), the hero/CTA wordmark and button text color (approximated as Tailwind `sky-700`/`sky-800`), and focus/hover emphasis on interactive elements (`focus-within:border-primary/50` equivalents, links). Reserved almost entirely for the two full-bleed sky sections plus small text accents (the bilingual pill, step-number circles) — it never appears as a large flat fill outside the sky itself.

### Neutral
- **Canvas White** (`#ffffff`, token `--canvas` / `--background`): page background, card interiors nested inside gray sections.
- **Soft Canvas** (`#f8f9fa`, token `--canvas-soft`): secondary background for composer text areas on dashboard.
- **Card Gray** (`#f5f5f5`, token `--surface-card`): the default "raised" content-card background against white sections (mechanism cards, capability tiles, FAQ section background at 40% opacity).
- **Strong Gray** (`#e5e7eb`, token `--surface-strong` / `--hairline`): borders throughout (`border-hairline`), and the flat "Voluntary" / "Active" badge background.
- **Hairline Strong** (`#d1d5db`, token `--hairline-strong`): heavier dividers (the "withdrawn" strikethrough plate border, gap between mechanism steps).
- **Body Gray** (`#374151`, token `--body`): body copy — never pure black, always slightly softened.
- **Muted Ink** (`#6b7280`, token `--muted-ink` / `--muted-foreground`): captions, timestamps, secondary metadata (QCO citation lines, allied-standard titles).

### Semantic (status, not decoration)
- **Destructive Red** (`#ef4444`, token `--destructive` / `--error`): the MANDATORY regulatory badge and withdrawn-standard markers — reserved exclusively for "this carries legal/compliance weight," never used decoratively.
- **Success Green** (`#10b981`, token `--success`): defined in tokens for future use (trading-up on dashboard); not used on the landing page.
- **Warning Amber** (`#f59e0b`, token `--warning`): defined in tokens; not used on the landing page.

### Named Rules
**The One Accent Rule.** Sky blue appears in exactly two places at full saturation: the hero CloudShader and the CTA-band CloudShader. Everywhere else it is either link/focus-state emphasis or the sky-700/800 text color on white pill buttons sitting over the sky. It is never a solid fill on a flat white or gray section.

**The Verified-Fact Plate Rule.** Any claim the system has independently checked (not merely stated) gets rendered on a black (`--ink`) plate with white text — the merge/verify step, the 187-QCO coverage stat, the resolved current-edition card. A white-on-gray card is a *claim*; a black plate is a *checked fact*.

## Typography

**Display/Body Font:** Inter (`var(--font-inter)`, fallback: Helvetica Neue, Helvetica, Arial, sans-serif) — the only typeface used across landing and dashboard.
**Label/Mono Font:** JetBrains Mono (`var(--font-jetbrains-mono)`, fallback: ui-monospace, SFMono-Regular, Menlo, monospace) — used exclusively for standard designations (`IS 17631:2022`), draft clause text, and other citable/verifiable strings, never for decorative labels.

**Character:** A single confident grotesque (Inter) carries every weight of the hierarchy from a 70px hero headline down to 10px badge labels — there is no serif or display face. The monospace face is used narrowly and meaningfully: switching a string to JetBrains Mono is itself a signal that the string is a verifiable citation, not prose.

### Hierarchy
- **Display** (700, `2.5rem`→`4.375rem` clamped via `text-[2.5rem] sm:text-6xl md:text-7xl`, line-height 1.05–1.1): the hero H1 only ("Cite the right standard. Every time.").
- **Headline** (600, `28px`→`34px`, line-height 1.15): section H2s (mechanism, proof, capabilities, FAQ) — always paired with a `max-w-2xl` body subhead directly beneath.
- **Title** (600, `14.5px`–`15px`, line-height 1.3): card/component titles inside sections (capability card headers, mechanism step titles, FAQ question text).
- **Body** (400, `13px`–`15px`, line-height 1.55–1.7): all paragraph copy; section subheads sit at the top of this range (15px/1.7), card body copy at the bottom (12.5–13.5px/1.55–1.65).
- **Label** (600 mono or 500–600 sans, `10px`–`13px`, tracking 0–0.02em, sometimes uppercase): badges (`text-[10px]` to `text-[10.5px]`, pill-shaped), eyebrow labels (`text-[11px] font-semibold uppercase tracking-wide`, e.g. "Procurement requirement"), and standard designations (`font-mono`, 12–13px).

### Named Rules
**The Mono-Means-Verifiable Rule.** Any text rendered in JetBrains Mono — a standard number, a draft clause, an S.O. gazette citation — is a string the system claims to have checked. Prose explanation is always Inter; switching font family mid-sentence is the system's way of marking "this part is a citation."

## Layout

The page is a stack of full-width `<section>`s, each `border-t border-hairline` against the one above it, with inner content re-centered and capped per section (`max-w-5xl` for most sections, `max-w-3xl` for the hero's text column and for FAQ). Horizontal padding is `px-5` on mobile, `md:px-8` on desktop; vertical section padding is `py-20` mobile, `md:py-28` desktop (the CTA band and footer use tighter `py-20`/`md:py-24` and `py-10` respectively).

Within a section, the pattern is consistent: a left-aligned headline + one-sentence subhead capped at `max-w-2xl`, then a `mt-12`–`mt-14` content block that's allowed to use the section's full `max-w-5xl` width — grids, comparison tables, or the bento layout in Capabilities (`lg:grid-cols-4` with `lg:auto-rows-[210px]` and `grid-flow-dense` for a Pinterest-style asymmetric tile pack).

The hero breaks the stacked-section rule deliberately: it is the only place content is centered (`max-w-3xl mx-auto text-center`) and the only place a floating panel (`ProductPreview`) overlaps two visual zones — it sits inside the hero's `max-w-5xl` wrapper but visually docks partway between the sky and the white content below, anchored by `-mt` overlap-free stacking rather than negative margins (the sky simply extends tall enough via `pb-16 md:pb-24` inside the hero to contain the floating card).

Responsive behavior is consistently mobile-first two-column-to-one-column: mechanism's two branch cards go `md:grid-cols-2` → 1 column; proof's three-column comparison row goes `md:grid-cols-[1fr_1.3fr_1.3fr]` → stacked; capabilities' bento collapses from 4 columns to 1; the nav's anchor links (`hidden md:flex`) disappear entirely below `md`, leaving only the wordmark and the CTA pill.

## Elevation & Depth

The system is flat by default and uses exactly one motion-linked elevation behavior rather than a shadow scale: `.card-hover` (`box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08)` plus `translateY(-2px)`) applies only on `:hover`, and shadcn primitives (card/input/button/badge) explicitly zero out their default shadows (`[data-slot="card"], [data-slot="input"], [data-slot="button"], [data-slot="badge"] { box-shadow: none; }` in `globals.css`). Depth at rest is conveyed by flat tonal layering instead — white section on gray section on white card on darker "verified fact" plate — never by a drop shadow. The two exceptions are the hero's `ProductPreview` panel and the nav/CTA pills sitting directly on the CloudShader, which carry `shadow-2xl`/`shadow-lg`/`shadow-md`: shadow is reserved for elements floating over the one non-flat, photographic-feeling surface in the system (the sky), where a flat edge would look like a rendering bug rather than for ordinary UI chrome.

### Shadow Vocabulary
- **Hover lift** (`0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08)`, with `translateY(-2px)`): the only shadow used on a static (non-hero) surface; a state response to hover, never a resting-state cue.
- **Sky-float** (`shadow-2xl` / `shadow-lg` / `shadow-md`, Tailwind defaults): reserved for elements docked on top of the CloudShader — the hero's product-preview panel, the hero/CTA nav buttons, the "Open the workspace" CTA — so they read as physically floating above the rendered sky.

### Named Rules
**The Flat-Except-Sky Rule.** Nothing gets a resting shadow unless it sits directly on the CloudShader. Everywhere else, depth comes from flat color layering (white → gray → darker "verified" black) and from `.card-hover`'s hover-only lift, never from an ambient shadow at rest.

## Shapes

Radius scales from a tight `4px` (`--radius-xs`) up to a fully pill `9999px` (`--radius-pill`), and the system leans toward the generous end: cards and content containers consistently use `rounded-2xl` (20px, `--radius-2xl`), the largest non-pill step, giving every card a soft, friendly corner without going circular. Anything interactive and self-contained — buttons, badges, status pills, the "English · हिन्दी" chip — is fully pill-shaped (`rounded-full`). The one deliberate exception to full pill/2xl bimodality is the hero's `ProductPreview` panel and the CTA band's container, which step up to `rounded-[1.75rem]`/`rounded-[2rem]` — slightly softer than a card, marking them as the "hero-adjacent, floating" tier rather than an ordinary content card.

Borders are hairline throughout (`border-hairline`, `#e5e7eb`, effectively 1px) and are the primary shape-definer on white backgrounds — most cards on `bg-canvas` sections get a hairline border rather than a background color shift; cards on already-gray sections (`bg-surface-card`) sometimes drop the border since the tonal shift alone reads as a boundary. There is no clipping, mask, or non-rectilinear silhouette anywhere in the system except inside the CloudShader canvas itself.

## Components

### Buttons
- **Shape:** pill (`rounded-full`, `--radius-pill`) for every button on the landing page; the dashboard composer's icon buttons use `rounded-lg` (8px) instead, since they're compact icon-only controls, not label pills.
- **Primary (on white/gray):** `bg-primary` (`#111111`) with `text-on-primary` (white), used for the dashboard's message-send button; `padding` is compact (`size-9` icon button on dashboard).
- **Primary (on sky/CloudShader):** white background (`bg-white`) with `sky-700` text, `px-6 py-2.5` to `px-7 py-3`, `shadow-lg`, and a `hover:-translate-y-0.5` lift plus `hover:bg-white/90` — this is the button used for every "Open the workspace" CTA (hero, CTA band).
- **Secondary/Ghost (on sky):** `border border-white/40 bg-white/10 text-white`, `backdrop-blur-sm`, `hover:bg-white/20` — used for the hero's "See how it works" scroll-anchor link, deliberately lower-contrast than the primary CTA it sits beside.
- **Nav pill (on sky):** same white/sky-700 treatment as primary, smaller (`px-4 py-2`, `text-[13px]`) — the header's "Open the workspace" link.

### Chips / Status Badges
- **Regulatory badges:** MANDATORY = `bg-destructive text-white` (pill); UPCOMING = `bg-ink text-canvas` (pill); VOLUNTARY = `bg-surface-strong text-ink` (pill); NEEDS_REVIEW = `border border-hairline-strong text-ink`, no fill (pill outline). This exact mapping is shared verbatim between the landing page's capabilities section and the dashboard's `RecommendationSearch` component (`REGULATORY` lookup: `MANDATORY→destructive`, `UPCOMING→default`(ink), `VOLUNTARY→secondary`(gray), `NEEDS_REVIEW→outline`) — it is the system's single most load-bearing color convention and must never be reassigned.
- **Lifecycle badges:** ACTIVE = `secondary` (gray fill), WITHDRAWN = `destructive` (red fill), UNKNOWN = `outline`.
- **Role/eyebrow chips:** `outline` variant (transparent, `text-foreground`, hairline border) for neutral metadata like "Normative reference" or "Test method" — outline is the default treatment for informational-not-evaluative tags, reserving filled/red for anything that carries compliance weight.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (20px) is the default for content cards; the hero preview and CTA band step up to `rounded-[1.75rem]`/`rounded-[2rem]`.
- **Background:** `bg-surface-card` (`#f5f5f5`) is the default card fill on white sections; `bg-canvas` (white) is used for the innermost nested plate inside a gray card (e.g. the code/citation snippet inside a capability tile); `bg-ink` is reserved for "verified fact" plates (see Colors → Named Rules).
- **Shadow Strategy:** none at rest; `.card-hover` on hover where used (see Elevation & Depth).
- **Border:** `border border-hairline` on cards sitting on white (`bg-canvas`) sections; omitted on cards already sitting on a gray section background, where the card itself uses `bg-canvas` to read as a lighter plate instead.
- **Internal Padding:** `p-6` (24px) is the standard card padding; `p-5` (20px) for denser panels (hero preview columns); `p-3`–`p-3.5` for nested snippet/citation plates inside a card.

### Inputs / Fields
- **Style:** `rounded-xl` (dashboard composer wrapper) with `border border-hairline`, `bg-surface-card` fill, textarea itself transparent with no inner border.
- **Focus:** the wrapper gains `focus-within:border-primary/50` — a subtle border-color shift to the ink primary at 50% opacity, no glow or ring.
- **Disabled:** the send button drops to `disabled:opacity-30` with no color change, keeping the disabled state legible but clearly inert.

### Navigation
- **Style:** the landing nav is transparent, laid directly over the CloudShader (`relative z-20`, no background), with the wordmark on the left, three text anchor links centered (`hidden md:flex`, `text-white/85` default, `hover:text-white`), and a white CTA pill on the right. On scroll past the hero there is no sticky/fixed nav — the header exists only within the hero's sky.
- **Mobile:** anchor links are hidden entirely below `md`; only wordmark and CTA pill remain, keeping the header to two elements on small screens.
- **Footer:** flat, white, `border-t border-hairline`, wordmark + tagline on the left, a single "Product" link group on the right, and a legal/sourcing disclaimer line in a second `border-t` strip beneath — no social icons, no multi-column sitemap.

### CloudShader (signature component)
A full-bleed WebGL canvas (`components/ui/cloud-shader.tsx`) rendering procedurally animated clouds over a two-stop vertical sky gradient, used as the background for exactly two sections: the hero (`skyTopColor="#2f6ba8"`, `skyBottomColor="#8cbfe8"`, default 6 cloud layers) and the CTA band (`skyTopColor="#245b91"`, `skyBottomColor="#6fa8d8"`, reduced to 3 clouds at 0.6× speed — a calmer, more distant variant for the closing moment). It respects `prefers-reduced-motion` by freezing at `t=0`. This is the system's one piece of spectacle and is never used decoratively behind ordinary content sections — only behind a headline+CTA pairing that earns full-bleed treatment.

### Scroll-Reveal (motion primitive)
`useScrollReveal` (IntersectionObserver, threshold 0.15) adds a `.visible` class to a section wrapper and staggers its direct children in via `.reveal`/`.reveal.visible > *` CSS (`fade-in-up`-style, `translateY(24px)→0` over 0.5–0.6s with a `cubic-bezier(0.16, 1, 0.3, 1)` "gentle overshoot-free" ease, per-child delays stepping 80ms up to a 6th child). Applied to every section below the hero. The hero itself uses a separate one-time, non-scroll-triggered entrance (`animate-hero-badge/title/subtitle/cta/card`, sequential delays 0.1s→0.55s) since it's visible on load rather than triggered by scroll. Both respect `prefers-reduced-motion: reduce` by disabling entirely.

## Do's and Don'ts

### Do:
- **Do** use JetBrains Mono exclusively for verifiable strings — standard numbers, draft clause text, gazette citations — never for section headings or prose.
- **Do** use the exact regulatory-badge color mapping everywhere the app shows a `regulatoryStatus`: MANDATORY→red fill, UPCOMING→black fill, VOLUNTARY→gray fill, NEEDS_REVIEW→outline-only. This mapping is shared between landing and dashboard and must not drift between surfaces.
- **Do** reserve the sky-blue accent for the CloudShader sections and small interactive/link emphasis; keep every other section ink-on-white or ink-on-gray.
- **Do** render independently-verified claims (the QCO count, the merge/verify step, the resolved current edition) on a black `--ink` plate with white text, distinct from ordinary white/gray content cards.
- **Do** cap every section's headline+subhead at `max-w-2xl` before widening into full-width content.
- **Do** apply `.card-hover` (shadow + 2px lift) only as a hover response, never as a resting-state shadow off the CloudShader.

### Don't:
- **Don't** add a resting drop-shadow to any card, badge, or button that isn't floating on top of the CloudShader — depth comes from flat tonal layering, not ambient shadow.
- **Don't** use a gradient fill on a button or card; the only gradient in the system is the CloudShader's sky, rendered in WebGL, not CSS.
- **Don't** introduce a second accent color. If a new status or emphasis is needed, express it through the existing ink/gray/red vocabulary (or, for something explicitly checked/verified, the black "verified fact" plate) rather than a new hue.
- **Don't** use decorative sparkle/AI-badge iconography to imply trust without a citable mechanism attached in the same component — every trust signal on this page traces to a real check (independent QCO query, post-hoc citation verification, version resolution).
- **Don't** make a section full-width edge-to-edge; every section's content stays inside `max-w-5xl` (or `max-w-3xl` for hero text/FAQ), even when its background spans the viewport.
