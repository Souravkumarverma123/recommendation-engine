import Link from "next/link";

import { CloudShader } from "~/components/ui/cloud-shader";
import { PIPELINE_STAGES, PipelinePill } from "./pipeline-pill";

function MockupCard() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-white/40 bg-white shadow-2xl">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-gray-400">recommend.run</span>
      </div>

      <div className="grid md:grid-cols-[1fr_1.3fr]">
        <div className="hidden border-gray-100 bg-[#f8f9ff] p-5 md:block md:border-r">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.88px] text-gray-400">
            Procurement requirement
          </p>
          <div className="rounded-lg border border-[#e0e7ff] bg-white p-4 font-mono text-[13px] leading-[1.6] text-gray-700 shadow-sm">
            500 ergonomic office chairs for a government secretariat, adjustable
            height, lumbar support
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {PIPELINE_STAGES.map((stage) => (
              <PipelinePill key={stage.pill} label={stage.pill} className={stage.className} />
            ))}
          </div>
        </div>

        <div className="bg-white p-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.88px] text-gray-400">
            Result
          </p>
          <div className="rounded-xl border border-gray-100 bg-[#f8f9ff] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-gray-900">IS 17631 : 2022</span>
              <span className="inline-flex items-center rounded-full bg-[#c08532] px-[10px] py-1 text-[11px] font-semibold uppercase tracking-[0.88px] text-white">
                Mandatory · QCO
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Office chairs — Specification</p>
            <p className="mt-3 text-xs leading-[1.5] text-gray-500">
              Furniture (Quality Control) Order 2025 · S.O. 801(E) · in force
              from 14 Feb 2026
            </p>
            <p className="mt-3 text-xs leading-[1.5] text-gray-500">
              Evidence: <span className="font-medium text-gray-900">&ldquo;ergonomic office chairs&rdquo;</span>,{" "}
              <span className="font-medium text-gray-900">&ldquo;adjustable height&rdquo;</span>
            </p>
          </div>
          <div className="mt-3 border-l-2 border-[#e0e7ff] pl-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.88px] text-gray-400">
              Allied standards
            </p>
            <p className="mt-1.5 font-mono text-xs text-gray-600">IS 3087 · Test method</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATS = [
  { value: "22,000+", label: "Indian Standards indexed" },
  { value: "500+", label: "Quality Control Orders tracked" },
  { value: "< 10s", label: "Average response time" },
];

export function Hero() {
  return (
    <section className="relative min-h-[50rem] w-full overflow-hidden">
      <CloudShader className="absolute inset-0" />

      {/* hero content */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pt-20 text-center md:pt-28">
        <span className="animate-hero-badge mb-6 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.88px] text-white backdrop-blur-sm">
          Built for GFR &amp; QCO compliance
        </span>
        <h1 className="animate-hero-title max-w-[880px] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-white drop-shadow-md sm:text-[56px] sm:leading-[1.05] lg:text-[72px]">
          Cite the right Indian Standard.{" "}
          <br className="hidden md:block" />
          Every time.
        </h1>
        <p className="animate-hero-subtitle mt-6 max-w-[620px] text-base leading-[1.6] text-white/85 drop-shadow-sm md:text-lg">
          Paste a procurement requirement and get ranked Indian Standards with
          verified current editions, an independent mandatory-certification
          check, allied standards, and evidence you can defend to an auditor —
          in English or Hindi.
        </p>

        <div className="animate-hero-cta mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-sky-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            Try the recommendation engine
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            See how it works
          </a>
        </div>

        {/* Social proof stats */}
        <div className="animate-hero-cta mt-10 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="font-mono text-[28px] font-bold leading-none text-white drop-shadow-sm sm:text-[32px]">
                {stat.value}
              </span>
              <span className="mt-1.5 text-[12px] text-white/60">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="animate-hero-cta mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex size-3.5 items-center justify-center rounded-full bg-white/20">
              <span className="size-1.5 rounded-full bg-white" />
            </span>
            BIS catalogue verified
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="flex size-3.5 items-center justify-center rounded-full bg-white/20">
              <span className="size-1.5 rounded-full bg-white" />
            </span>
            English &amp; Hindi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="flex size-3.5 items-center justify-center rounded-full bg-white/20">
              <span className="size-1.5 rounded-full bg-white" />
            </span>
            Audit-ready evidence
          </span>
        </div>
      </div>

      {/* Mockup card — white with black text, blue/near-white accents */}
      <div className="animate-hero-card relative z-10 mx-auto mt-12 w-full max-w-5xl px-4 pb-6 md:mt-16 md:px-8">
        <div className="rounded-[24px] border border-white/30 bg-white/20 p-2 shadow-2xl backdrop-blur-md md:p-3">
          <MockupCard />
        </div>
      </div>
    </section>
  );
}
