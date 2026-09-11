"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useScrollReveal } from "~/hooks/use-scroll-reveal";

export function CtaBand() {
  const ref = useScrollReveal();

  return (
    <section className="border-t border-hairline bg-canvas px-6 py-24">
      <div ref={ref} className="reveal mx-auto flex max-w-[720px] flex-col items-center text-center">
        <span className="mb-4 inline-flex items-center rounded-pill bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.88px] text-primary">
          Free to try
        </span>
        <h2 className="text-[32px] font-normal leading-[1.2] tracking-[-0.72px] text-ink sm:text-[40px] sm:tracking-[-0.8px]">
          Stop guessing which standard applies.
        </h2>
        <p className="mt-4 max-w-[520px] text-base leading-[1.5] text-body">
          Paste your next procurement requirement and see the ranked
          standards, the regulatory badge, and the draft clause in seconds.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-success" />
            No sign-up required
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-success" />
            Works in English &amp; Hindi
          </span>
        </div>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-8 text-[15px] font-semibold text-on-primary transition-all hover:bg-primary-active hover:scale-[1.02]"
        >
          Try the recommendation engine
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
