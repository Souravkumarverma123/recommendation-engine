"use client";

import { PipelinePill } from "./pipeline-pill";
import { useScrollReveal } from "~/hooks/use-scroll-reveal";

const STAGES = [
  {
    step: "01",
    pill: "Thinking",
    className: "bg-timeline-thinking text-ink",
    title: "Understand",
    body: "Normalises the requirement — English or Hindi — and detects the language for the response.",
  },
  {
    step: "02",
    pill: "Grepping",
    className: "bg-timeline-grep text-ink",
    title: "Search",
    body: "Hybrid retrieval: semantic search over embeddings fused with lexical search via Reciprocal Rank Fusion.",
  },
  {
    step: "03",
    pill: "Reading",
    className: "bg-timeline-read text-ink",
    title: "Assemble",
    body: "Pulls metadata and cross-reference neighbours for the top candidates from the catalogue.",
  },
  {
    step: "04",
    pill: "Editing",
    className: "bg-timeline-edit text-ink",
    title: "Reason",
    body: "An LLM ranks candidates, classifies roles, and writes evidence and a draft clause — constrained to the supplied candidates only.",
  },
  {
    step: "05",
    pill: "Done",
    className: "bg-timeline-done text-white",
    title: "Verify",
    body: "An independent QCO check and version resolution override the model; unverifiable standard numbers are dropped.",
  },
];

export function PipelineSection() {
  const sectionRef = useScrollReveal();

  return (
    <section id="how-it-works" className="border-t border-hairline bg-canvas-soft px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div ref={sectionRef} className="reveal">
          <div className="max-w-[640px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.88px] text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-3 text-[28px] font-normal leading-[1.2] tracking-[-0.6px] text-ink sm:text-[36px] sm:tracking-[-0.72px]">
              One pipeline, five verified stages
            </h2>
            <p className="mt-4 text-base leading-[1.5] text-body">
              Every request moves through the same agent timeline — nothing
              reaches you unless it traces back to a real record in the BIS
              catalogue.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
            {STAGES.map((stage, i) => (
              <div
                key={stage.title}
                className="card-hover relative flex flex-col rounded-lg border border-hairline bg-surface-card p-5"
              >
                <span className="mb-4 font-mono text-[32px] font-bold leading-none text-primary">
                  {stage.step}
                </span>
                <PipelinePill label={stage.pill} className={stage.className} />
                <h3 className="mt-3 text-[15px] font-semibold leading-[1.4] text-ink">
                  {stage.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.6] text-body">
                  {stage.body}
                </p>
                {i < STAGES.length - 1 && (
                  <span className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-[calc(50%+6px)] text-hairline lg:block">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
