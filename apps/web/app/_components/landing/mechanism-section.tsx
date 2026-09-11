"use client";

import { useScrollReveal } from "~/hooks/use-scroll-reveal";

export function MechanismSection() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section id="mechanism" className="border-t border-hairline bg-canvas">
      <div
        ref={ref}
        className="reveal mx-auto max-w-5xl px-5 py-20 md:px-8 md:py-28"
      >
        <div className="max-w-2xl">
          <h2 className="text-[28px] leading-[1.15] font-semibold tracking-tight text-ink md:text-[34px]">
            Two independent checks. One verified answer.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-body">
            Most tools read &ldquo;a standard exists&rdquo; and guess at
            certification. Manak runs the regulatory check as its own
            query — against the QCO layer, for the product — every time. A
            clean result means it was checked, not that nobody looked.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-hairline bg-surface-card p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-700/10 text-[11px] font-semibold text-sky-700">
                1
              </span>
              <h3 className="text-[15px] font-semibold text-ink">
                Standard search
              </h3>
            </div>
            <p className="mt-2 text-[13.5px] leading-[1.65] text-body">
              Hybrid lexical and semantic retrieval finds every candidate
              standard for the requirement, then walks the allied-standards
              graph for its normative references, test methods, and safety
              companions.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg bg-canvas p-3">
              <span className="font-mono text-[12px] font-semibold text-ink">
                IS 17631:2022
              </span>
              <span className="text-[12px] text-muted-foreground">
                Work chairs
              </span>
              <span className="ml-auto rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-semibold text-ink">
                Active
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-hairline bg-surface-card p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-700/10 text-[11px] font-semibold text-sky-700">
                2
              </span>
              <h3 className="text-[15px] font-semibold text-ink">
                Regulatory / QCO search
              </h3>
            </div>
            <p className="mt-2 text-[13.5px] leading-[1.65] text-body">
              A separate query against the Quality Control Order layer for
              the product itself — never inferred from the fact that a
              standard was found. &ldquo;No QCO found&rdquo; is a verified
              result, not silence.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg bg-canvas p-3">
              <span className="text-[12px] text-ink">Furniture (QCO) 2025</span>
              <span className="ml-auto rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-canvas">
                Upcoming
              </span>
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-2 h-8 w-px bg-hairline-strong md:mt-2" />

        <div className="rounded-2xl border border-hairline bg-ink p-6 text-canvas md:p-7">
          <h3 className="text-[15px] font-semibold">
            Merge, version-resolve, verify
          </h3>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-[1.65] text-white/70">
            The two branches meet in the data layer, not the model. The
            current edition is confirmed, the regulatory badge is attached
            with its citation, and every designation the reasoning step
            drafted is checked back against the verified candidates before it
            reaches you. The model proposes; the data layer decides.
          </p>
        </div>
      </div>
    </section>
  );
}
