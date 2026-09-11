"use client";

import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";

import { CloudShader } from "~/components/ui/cloud-shader";

const GITHUB_URL =
  "https://github.com/Souravkumarverma123/recommendation-engine";

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span
        className={
          dark
            ? "flex size-7 items-center justify-center rounded-md bg-ink text-[13px] font-bold text-canvas"
            : "flex size-7 items-center justify-center rounded-md bg-white/90 text-[13px] font-bold text-sky-700 shadow-sm"
        }
      >
        म
      </span>
      <span
        className={
          dark
            ? "text-[15px] font-semibold tracking-tight text-ink"
            : "text-[15px] font-semibold tracking-tight text-white drop-shadow-sm"
        }
      >
        Manak
      </span>
    </Link>
  );
}

function HeroNav() {
  return (
    <nav className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
      <Wordmark />
      <div className="hidden items-center gap-8 text-[13px] font-medium text-white/85 md:flex">
        <a href="#mechanism" className="transition-colors hover:text-white">
          How it works
        </a>
        <a href="#capabilities" className="transition-colors hover:text-white">
          What you get
        </a>
        <a href="#faq" className="transition-colors hover:text-white">
          FAQ
        </a>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
          className="flex size-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Github className="size-[18px]" />
        </a>
        <Link
          href="/dashboard"
          className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-sky-700 shadow-md transition hover:bg-white/90"
        >
          Open the workspace
        </Link>
      </div>
    </nav>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-3xl rounded-2xl border border-white/30 bg-white/90 p-1.5 shadow-2xl backdrop-blur-md md:rounded-[1.75rem] md:p-2">
      <div className="rounded-xl border border-hairline bg-canvas md:rounded-3xl">
        <div className="flex flex-col divide-y divide-hairline md:flex-row md:divide-x md:divide-y-0">
          {/* Requirement column */}
          <div className="flex flex-col p-5 md:w-[38%] md:shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Procurement requirement
            </p>
            <p className="mt-2 text-[14px] leading-[1.5] text-ink">
              &ldquo;500 ergonomic office chairs — swivel, height-adjustable,
              for a district office.&rdquo;
            </p>
            <div className="mt-6 flex flex-1 flex-col justify-end gap-2">
              <p className="text-[11px] text-muted-foreground">
                Checked against the BIS catalogue and the QCO layer
                independently — mandatory status is verified, never guessed.
              </p>
            </div>
          </div>

          {/* Result column */}
          <div className="flex flex-1 flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[13px] font-semibold text-ink">
                IS 17631:2022
              </span>
              <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-canvas">
                Upcoming QCO
              </span>
              <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-semibold text-ink">
                Active
              </span>
            </div>
            <p className="text-[13px] text-body">Work chairs</p>
            <p className="text-[12px] leading-[1.6] text-muted-foreground">
              Furniture (QCO) 2025 · S.O. 801(E) · in force from{" "}
              <span className="text-ink">14 Aug 2026</span> (MSME)
            </p>
            <div className="mt-1 rounded-lg bg-surface-card p-3">
              <p className="font-mono text-[11.5px] leading-[1.7] text-body">
                &hellip;shall conform to IS 17631:2022 and bear the Standard
                Mark (ISI) under BIS licence&hellip;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <div className="relative w-full overflow-hidden">
      <CloudShader
        className="absolute inset-0"
        skyTopColor="#2f6ba8"
        skyBottomColor="#8cbfe8"
        cloudColor="#fbf8f2"
      />

      <HeroNav />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 pt-10 text-center md:pt-16">
        <h1 className="animate-hero-title text-[2.5rem] leading-[1.1] font-bold tracking-tight text-white drop-shadow-md sm:text-6xl md:text-7xl md:leading-[1.05]">
          Cite the right
          <br className="hidden md:block" /> standard. Every time.
        </h1>
        <p className="animate-hero-subtitle mt-6 max-w-xl text-[15px] leading-[1.6] text-white/90 drop-shadow-sm md:text-[17px]">
          Paste a procurement requirement, in English or Hindi. Get the
          current Indian Standard, its verified BIS certification status, and
          a citation you can defend to an auditor.
        </p>
        <div className="animate-hero-cta mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-sky-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            Open the workspace
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#mechanism"
            className="rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-[14px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            See how it works
          </a>
        </div>
        <p className="mt-4 text-[12px] text-white/70">
          187 QCOs checked independently, across ~769 products — never
          inferred from the standard alone.
        </p>
      </div>

      <div className="animate-hero-card relative z-10 mx-auto mt-12 w-full max-w-5xl px-5 pb-16 md:mt-16 md:px-8 md:pb-24">
        <ProductPreview />
      </div>
    </div>
  );
}
