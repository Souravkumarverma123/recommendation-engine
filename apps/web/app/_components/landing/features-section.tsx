"use client";

import {
  AlertTriangle,
  GitBranch,
  Languages,
  MessageSquareQuote,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useScrollReveal } from "~/hooks/use-scroll-reveal";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Independent QCO check",
    body: "Every recommendation is checked against the regulatory layer separately from retrieval. VOLUNTARY means checked and confirmed — not \u201cwe didn\u2019t look.\u201d",
    bg: "bg-[#eff6ff]",
    border: "border-[#dbeafe]",
    iconBg: "bg-[#dbeafe]",
    iconColor: "text-[#2563eb]",
    span: "md:col-span-4",
  },
  {
    icon: RefreshCw,
    title: "Current-edition guarantee",
    body: "Supersession is followed automatically, even across different standard numbers, so you never cite a withdrawn edition.",
    bg: "bg-[#fdf2f8]",
    border: "border-[#fce7f3]",
    iconBg: "bg-[#fce7f3]",
    iconColor: "text-[#db2777]",
    span: "md:col-span-2",
  },
  {
    icon: GitBranch,
    title: "Allied standards graph",
    body: "Normative references, test methods, safety and terminology standards — each tagged by role, so you know where it belongs in the spec.",
    bg: "bg-[#f5f3ff]",
    border: "border-[#ede9fe]",
    iconBg: "bg-[#ede9fe]",
    iconColor: "text-[#7c3aed]",
    span: "md:col-span-2",
  },
  {
    icon: MessageSquareQuote,
    title: "Evidence you can defend",
    body: "The exact phrases from your input that triggered each recommendation — ready for file notes and audit.",
    bg: "bg-[#f0f9ff]",
    border: "border-[#e0f2fe]",
    iconBg: "bg-[#e0f2fe]",
    iconColor: "text-[#0284c7]",
    span: "md:col-span-4",
  },
  {
    icon: AlertTriangle,
    title: "Gap warnings",
    body: "Brand names, foreign standards with an Indian equivalent, non-metric units, and superseded citations — flagged before you publish.",
    bg: "bg-[#fff1f2]",
    border: "border-[#ffe4e6]",
    iconBg: "bg-[#ffe4e6]",
    iconColor: "text-[#e11d48]",
    span: "md:col-span-3",
  },
  {
    icon: Languages,
    title: "English or Hindi",
    body: "Describe the requirement in either language; standard numbers and titles stay canonical regardless.",
    bg: "bg-[#eef2ff]",
    border: "border-[#e0e7ff]",
    iconBg: "bg-[#e0e7ff]",
    iconColor: "text-[#4f46e5]",
    span: "md:col-span-3",
  },
];

export function FeaturesSection() {
  const sectionRef = useScrollReveal();

  return (
    <section id="features" className="border-t border-hairline bg-canvas px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div ref={sectionRef} className="reveal">
          <div className="max-w-[640px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.88px] text-muted-foreground">
              What you get
            </p>
            <h2 className="mt-3 text-[28px] font-normal leading-[1.2] tracking-[-0.6px] text-ink sm:text-[36px] sm:tracking-[-0.72px]">
              Every result, fully defensible
            </h2>
            <p className="mt-3 max-w-[560px] text-[14px] leading-[1.6] text-body">
              Six capabilities, one defensible output — designed as a bento of complementary checks.
            </p>
          </div>

          {/* Bento grid */}
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`group relative flex flex-col rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-lg md:p-7 ${f.bg} ${f.border} ${f.span}`}
              >
                <div className={`flex size-10 items-center justify-center rounded-xl ${f.iconBg}`}>
                  <f.icon className={`size-5 ${f.iconColor}`} />
                </div>
                <h3 className="mt-5 text-[17px] font-semibold leading-[1.3] text-gray-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-gray-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
