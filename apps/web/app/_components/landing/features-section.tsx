import {
  AlertTriangle,
  GitBranch,
  Languages,
  MessageSquareQuote,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Independent QCO check",
    body: "Every recommendation is checked against the regulatory layer separately from retrieval. VOLUNTARY means checked and confirmed — not “we didn't look.”",
  },
  {
    icon: RefreshCw,
    title: "Current-edition guarantee",
    body: "Supersession is followed automatically, even across different standard numbers, so you never cite a withdrawn edition.",
  },
  {
    icon: GitBranch,
    title: "Allied standards graph",
    body: "Normative references, test methods, safety and terminology standards — each tagged by role, so you know where it belongs in the spec.",
  },
  {
    icon: MessageSquareQuote,
    title: "Evidence you can defend",
    body: "The exact phrases from your input that triggered each recommendation — ready for file notes and audit.",
  },
  {
    icon: AlertTriangle,
    title: "Gap warnings",
    body: "Brand names, foreign standards with an Indian equivalent, non-metric units, and superseded citations — flagged before you publish.",
  },
  {
    icon: Languages,
    title: "English or Hindi",
    body: "Describe the requirement in either language; standard numbers and titles stay canonical regardless.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="border-t border-hairline bg-canvas px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="max-w-[640px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.88px] text-muted-foreground">
            What you get
          </p>
          <h2 className="mt-3 text-[28px] font-normal leading-[1.2] tracking-[-0.6px] text-ink sm:text-[36px] sm:tracking-[-0.72px]">
            Every result, fully defensible
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-hairline bg-surface-card p-6">
              <f.icon className="size-5 text-primary" />
              <h3 className="mt-4 text-[18px] font-semibold leading-[1.4] text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-[1.5] text-body">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
