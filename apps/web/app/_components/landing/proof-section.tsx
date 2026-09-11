"use client";

import { Check, X } from "lucide-react";

import { useScrollReveal } from "~/hooks/use-scroll-reveal";

const ROWS = [
  {
    scenario: "OPC 43 grade cement",
    citedAs: "cited to IS 8112",
    naive: "“Not in the QCO list → voluntary.”",
    correct: "IS 8112 was withdrawn — resolved to IS 269:2015, mandatory under the Cement QCO 2003.",
  },
  {
    scenario: "RCC structural work",
    citedAs: "per IS 456",
    naive: "“A standard exists → require the ISI mark.”",
    correct:
      "IS 456:2000 is a design code with no ISI mark. Requiring one is a restrictive specification — a GFR Rule 144 violation.",
  },
  {
    scenario: "500 ergonomic office chairs",
    citedAs: "",
    naive: "“Mandatory” — right, but by luck, with no citation.",
    correct:
      "Furniture (QCO) 2025, S.O. 801(E) — ISI mark under Scheme I, enforced 14 Aug 2026 for MSME.",
  },
];

export function ProofSection() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="border-t border-hairline bg-surface-card/40">
      <div
        ref={ref}
        className="reveal mx-auto max-w-5xl px-5 py-20 md:px-8 md:py-28"
      >
        <div className="max-w-2xl">
          <h2 className="text-[28px] leading-[1.15] font-semibold tracking-tight text-ink md:text-[34px]">
            Every one of these is a case where the obvious answer is wrong.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-body">
            A naive tool reads whether a standard exists and guesses at
            certification. That guess is exactly where an audit finding or a
            legal challenge comes from.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-hairline bg-canvas">
          <div className="grid grid-cols-1 divide-y divide-hairline">
            {ROWS.map((row) => (
              <div
                key={row.scenario}
                className="grid grid-cols-1 gap-4 p-6 md:grid-cols-[1fr_1.3fr_1.3fr] md:items-start md:gap-6"
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">
                    {row.scenario}
                  </p>
                  {row.citedAs && (
                    <p className="text-[12px] text-muted-foreground">
                      {row.citedAs}
                    </p>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p className="text-[13px] leading-[1.6] text-muted-foreground">
                    {row.naive}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-sky-700" />
                  <p className="text-[13px] leading-[1.6] text-body">
                    {row.correct}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-hairline bg-canvas p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13.5px] font-semibold text-ink">
              Bilingual, without losing precision
            </p>
            <p className="mt-1 max-w-xl text-[13px] leading-[1.6] text-body">
              &ldquo;मोटरसाइकिल हेलमेट के लिए मानक&rdquo; resolves to{" "}
              <span className="font-mono text-ink">IS 4151:2015</span>,
              mandatory since November 2020 — answered in Hindi, with the
              designation kept in its canonical form.
            </p>
          </div>
          <span className="w-fit shrink-0 rounded-full bg-sky-700/10 px-3 py-1 text-[12px] font-semibold text-sky-800">
            English · हिन्दी
          </span>
        </div>
      </div>
    </section>
  );
}
