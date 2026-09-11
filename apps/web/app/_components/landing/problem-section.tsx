import { AlertTriangle, Ban, FileWarning } from "lucide-react";

const PROBLEMS = [
  {
    icon: AlertTriangle,
    title: "Withdrawn standards slip through",
    body: "Citing a superseded edition in a tender is an audit finding — and the BIS portal won't tell you it happened.",
  },
  {
    icon: Ban,
    title: "Restrictive specifications",
    body: "Requiring the ISI mark for a product with no Quality Control Order is a restrictive specification under GFR Rule 144 — grounds for a tender challenge.",
  },
  {
    icon: FileWarning,
    title: "Missed mandatory certification",
    body: "A new QCO comes into force and nobody checked — the tender fails to require the certification the law now demands.",
  },
];

export function ProblemSection() {
  return (
    <section id="problem" className="border-t border-hairline bg-canvas px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="max-w-[640px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.88px] text-muted-foreground">
            The problem
          </p>
          <h2 className="mt-3 text-[28px] font-normal leading-[1.2] tracking-[-0.6px] text-ink sm:text-[36px] sm:tracking-[-0.72px]">
            Manual research is slow — and the mistakes are expensive
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="rounded-lg border border-hairline bg-surface-card p-6">
              <p.icon className="size-5 text-primary" />
              <h3 className="mt-4 text-[18px] font-semibold leading-[1.4] text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-[1.5] text-body">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
