"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CloudShader } from "~/components/ui/cloud-shader";
import { useScrollReveal } from "~/hooks/use-scroll-reveal";

export function CtaBand() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="border-t border-hairline bg-canvas px-5 py-20 md:px-8 md:py-24">
      <div
        ref={ref}
        className="reveal relative mx-auto max-w-5xl overflow-hidden rounded-[2rem]"
      >
        <CloudShader
          className="absolute inset-0"
          count={3}
          speed={0.6}
          skyTopColor="#245b91"
          skyBottomColor="#6fa8d8"
        />
        <div className="relative z-10 flex flex-col items-center px-6 py-16 text-center md:px-16 md:py-20">
          <h2 className="max-w-2xl text-[28px] leading-[1.2] font-semibold tracking-tight text-white drop-shadow-md md:text-[36px]">
            Draft your next tender with a citation you can defend.
          </h2>
          <p className="mt-4 max-w-lg text-[14.5px] leading-[1.6] text-white/85 drop-shadow-sm">
            Paste a requirement, get a verified standard, its certification
            status, and a clause ready to paste — in minutes, not days.
          </p>
          <Link
            href="/dashboard"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-[14.5px] font-semibold text-sky-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            Open the workspace
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
