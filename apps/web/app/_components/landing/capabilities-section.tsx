"use client";

import { useScrollReveal } from "~/hooks/use-scroll-reveal";

const BADGES = [
  {
    label: "Mandatory",
    tone: "bg-destructive text-white",
    note: "BIS certification required — the Standard Mark under licence.",
  },
  {
    label: "Upcoming",
    tone: "bg-ink text-canvas",
    note: "A QCO is published; the enforcement date hasn't arrived yet.",
  },
  {
    label: "Voluntary",
    tone: "bg-surface-strong text-ink",
    note: "Checked against the QCO layer, confirmed not mandatory.",
  },
  {
    label: "Needs review",
    tone: "border border-hairline-strong text-ink",
    note: "A scope-based QCO may apply — flagged for a manual check.",
  },
];

const ALLIED_ROLES = [
  "Normative reference",
  "Test method",
  "Safety",
  "Terminology",
  "Installation",
];

export function CapabilitiesSection() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section id="capabilities" className="border-t border-hairline bg-canvas">
      <div
        ref={ref}
        className="reveal mx-auto max-w-5xl px-5 py-20 md:px-8 md:py-28"
      >
        <div className="max-w-2xl">
          <h2 className="text-[28px] leading-[1.15] font-semibold tracking-tight text-ink md:text-[34px]">
            What you get on every recommendation.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-body">
            Not a search result — a citation with its edition confirmed, its
            certification status verified, and its dependencies mapped.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-flow-dense lg:auto-rows-[210px] lg:grid-cols-4">
          {/* Regulatory badges — wide */}
          <div className="rounded-2xl border border-hairline bg-surface-card p-6 lg:col-span-2">
            <h3 className="text-[14.5px] font-semibold text-ink">
              Every badge means something specific
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {BADGES.map((b) => (
                <div key={b.label} className="flex flex-col gap-1.5">
                  <span
                    className={`w-fit rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${b.tone}`}
                  >
                    {b.label}
                  </span>
                  <p className="text-[12px] leading-[1.5] text-muted-foreground">
                    {b.note}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Regulatory coverage — small, number set inline in prose */}
          <div className="flex flex-col justify-center rounded-2xl border border-hairline bg-ink p-6 text-canvas">
            <p className="text-[14.5px] leading-[1.6] text-white/85">
              Checked against all{" "}
              <span className="text-[19px] font-bold text-canvas">187</span>{" "}
              Quality Control Orders — regulatory obligations across{" "}
              <span className="font-semibold text-canvas">~769 products</span>
              , never a sampled subset.
            </p>
          </div>

          {/* Current edition — tall */}
          <div className="flex flex-col rounded-2xl border border-hairline bg-surface-card p-6 lg:row-span-2">
            <h3 className="text-[14.5px] font-semibold text-ink">
              Current edition, guaranteed
            </h3>
            <p className="mt-2 text-[12.5px] leading-[1.55] text-body">
              Supersession is followed even when the replacement has a
              different number.
            </p>
            <div className="mt-5 flex flex-1 flex-col justify-center gap-2">
              <div className="rounded-lg border border-hairline-strong bg-canvas px-3 py-2">
                <span className="font-mono text-[12.5px] text-muted-foreground line-through decoration-destructive/60">
                  IS 8112
                </span>
                <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                  Withdrawn
                </span>
              </div>
              <div className="ml-4 h-4 w-px bg-hairline-strong" />
              <div className="rounded-lg bg-ink px-3 py-2">
                <span className="font-mono text-[12.5px] font-semibold text-canvas">
                  IS 269:2015
                </span>
                <span className="ml-2 text-[11px] text-white/70">
                  current edition
                </span>
              </div>
            </div>
          </div>

          {/* Draft clause — wide */}
          <div className="flex flex-col rounded-2xl border border-hairline bg-surface-card p-6 lg:col-span-2">
            <h3 className="text-[14.5px] font-semibold text-ink">
              Draft clause, ready to paste
            </h3>
            <p className="mt-2 text-[12.5px] leading-[1.55] text-body">
              Worded to match the verified certification status — never
              over- or under-specified.
            </p>
            <div className="mt-4 flex-1 rounded-lg bg-canvas p-3.5">
              <p className="font-mono text-[12px] leading-[1.7] text-body">
                &ldquo;The goods supplied shall conform in all respects to IS
                17631:2022 (Work chairs) in its latest revision, and the
                supplier shall hold a valid Bureau of Indian Standards
                product-certification licence for the goods and mark them
                accordingly.&rdquo;
              </p>
            </div>
          </div>

          {/* Allied standards — small */}
          <div className="rounded-2xl border border-hairline bg-surface-card p-6">
            <h3 className="text-[14.5px] font-semibold text-ink">
              Allied standards, tagged by role
            </h3>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {ALLIED_ROLES.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-hairline-strong px-2.5 py-1 text-[11.5px] text-body"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
