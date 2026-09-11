"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useScrollReveal } from "~/hooks/use-scroll-reveal";

const ROWS = [
  { label: "Search standards by keyword", portal: true, engine: true },
  { label: "Rank standards by relevance to a free-text spec", portal: false, engine: true },
  { label: "Flag withdrawn or superseded editions", portal: false, engine: true },
  { label: "Check mandatory QCO certification independently", portal: false, engine: true },
  { label: "Tag allied standards by role", portal: false, engine: true },
  { label: "Understand a requirement written in Hindi", portal: false, engine: true },
];

function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="size-4 text-success" />
  ) : (
    <XCircle className="size-4 text-muted-soft" />
  );
}

export function ComparisonSection() {
  const sectionRef = useScrollReveal();

  return (
    <section className="border-t border-hairline bg-canvas-soft px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div ref={sectionRef} className="reveal">
          <div className="max-w-[640px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.88px] text-muted-foreground">
              Why not just search the BIS portal
            </p>
            <h2 className="mt-3 text-[28px] font-normal leading-[1.2] tracking-[-0.6px] text-ink sm:text-[36px] sm:tracking-[-0.72px]">
              Search finds standards. This tells you which ones apply.
            </h2>
          </div>

          <div className="mt-10 overflow-hidden rounded-xl border border-hairline bg-surface-card">
            <div className="grid grid-cols-[1fr_84px_84px] items-center gap-2 border-b border-hairline px-6 py-4 sm:grid-cols-[1fr_140px_140px] sm:gap-4">
              <span />
              <span className="text-center text-[11px] font-semibold uppercase tracking-[0.88px] text-muted-foreground">
                BIS portal
              </span>
              <span className="text-center text-[11px] font-semibold uppercase tracking-[0.88px] text-primary">
                This engine
              </span>
            </div>
            {ROWS.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1fr_84px_84px] items-center gap-2 px-6 py-4 sm:grid-cols-[1fr_140px_140px] sm:gap-4 ${
                  i < ROWS.length - 1 ? "border-b border-hairline-soft" : ""
                }`}
              >
                <span className="text-sm text-ink">{row.label}</span>
                <span className="flex justify-center">
                  <Mark ok={row.portal} />
                </span>
                <span className="flex justify-center">
                  <Mark ok={row.engine} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
