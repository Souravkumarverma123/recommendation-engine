import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PIPELINE_STAGES, PipelinePill } from "./pipeline-pill";

function MockupCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface-card">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <span className="size-2.5 rounded-full bg-hairline-strong" />
        <span className="size-2.5 rounded-full bg-hairline-strong" />
        <span className="size-2.5 rounded-full bg-hairline-strong" />
        <span className="ml-2 font-mono text-xs text-muted-foreground">recommend.run</span>
      </div>

      <div className="grid md:grid-cols-[1fr_1.3fr]">
        <div className="hidden border-hairline p-5 md:block md:border-r">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.88px] text-muted-foreground">
            Procurement requirement
          </p>
          <div className="rounded-md bg-canvas-soft p-4 font-mono text-[13px] leading-[1.6] text-body">
            500 ergonomic office chairs for a government secretariat, adjustable
            height, lumbar support
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {PIPELINE_STAGES.map((stage) => (
              <PipelinePill key={stage.pill} label={stage.pill} className={stage.className} />
            ))}
          </div>
        </div>

        <div className="p-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.88px] text-muted-foreground">
            Result
          </p>
          <div className="rounded-md border border-hairline bg-canvas-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-medium text-ink">IS 17631 : 2022</span>
              <span className="inline-flex items-center rounded-pill bg-timeline-done px-[10px] py-1 text-[11px] font-semibold uppercase tracking-[0.88px] text-white">
                Mandatory · QCO
              </span>
            </div>
            <p className="mt-2 text-sm text-body">Office chairs — Specification</p>
            <p className="mt-3 text-xs leading-[1.5] text-muted-foreground">
              Furniture (Quality Control) Order 2025 · S.O. 801(E) · in force
              from 14 Feb 2026
            </p>
            <p className="mt-3 text-xs leading-[1.5] text-muted-foreground">
              Evidence: <span className="text-ink">&ldquo;ergonomic office chairs&rdquo;</span>,{" "}
              <span className="text-ink">&ldquo;adjustable height&rdquo;</span>
            </p>
          </div>
          <div className="mt-3 border-l-2 border-hairline pl-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.88px] text-muted-foreground">
              Allied standards
            </p>
            <p className="mt-1.5 font-mono text-xs text-body">IS 3087 · Test method</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="bg-canvas px-6 pb-20 pt-20 sm:pt-28">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center text-center">
        <span className="mb-6 inline-flex items-center rounded-pill bg-surface-strong px-[10px] py-1 text-[11px] font-semibold uppercase tracking-[0.88px] text-ink">
          Built for GFR &amp; QCO compliance
        </span>
        <h1 className="max-w-[880px] text-[32px] font-normal leading-[1.15] tracking-[-0.8px] text-ink sm:text-[56px] sm:leading-[1.1] sm:tracking-[-1.4px] lg:text-[72px] lg:tracking-[-2.16px]">
          Cite the right Indian Standard. Every time.
        </h1>
        <p className="mt-6 max-w-[620px] text-base leading-[1.5] text-body">
          Paste a procurement requirement and get ranked Indian Standards with
          verified current editions, an independent mandatory-certification
          check, allied standards, and evidence you can defend to an auditor —
          in English or Hindi.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-medium text-canvas transition-colors hover:bg-ink/90"
          >
            Try the recommendation engine
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
          >
            See how it works
          </a>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-[980px]">
        <MockupCard />
      </div>
    </section>
  );
}
