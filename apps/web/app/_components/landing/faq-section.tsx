"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { useScrollReveal } from "~/hooks/use-scroll-reveal";

const FAQS = [
  {
    question: "How does the engine find the right standard?",
    answer:
      "It uses hybrid retrieval — semantic search over embeddings fused with lexical search via Reciprocal Rank Fusion — then an LLM ranks candidates and writes evidence. An independent QCO check and version resolution run after the model, so unverifiable standard numbers are dropped.",
  },
  {
    question: "Does it check mandatory certification (QCO) independently?",
    answer:
      "Yes. Every recommendation is checked against the regulatory layer separately from retrieval. The badge shows Mandatory · QCO, Upcoming QCO, or Voluntary — and VOLUNTARY means checked and confirmed, not \u201cwe didn\u2019t look.\u201d",
  },
  {
    question: "Can I describe the requirement in Hindi?",
    answer:
      "Yes. The engine normalises the requirement from English or Hindi and detects the language for the response. Standard numbers and titles stay canonical regardless of input language.",
  },
  {
    question: "What are \u201callied standards\u201d?",
    answer:
      "Normative references, test methods, safety and terminology standards that the primary standard depends on. Each is tagged by role so you know where it belongs in the specification.",
  },
  {
    question: "What evidence does the engine provide?",
    answer:
      "The exact phrases from your input that triggered each recommendation — ready for file notes and audit. You also get the QCO citation, enforcement date, and source link where available.",
  },
  {
    question: "Does it handle superseded or withdrawn editions?",
    answer:
      "Yes. Supersession is followed automatically, even across different standard numbers. If a standard has been withdrawn or replaced, the engine flags it and cites the current edition instead.",
  },
];

export function FaqSection() {
  const sectionRef = useScrollReveal();

  return (
    <section className="border-t border-hairline bg-canvas-soft px-6 py-20">
      <div className="mx-auto max-w-[720px]">
        <div ref={sectionRef} className="reveal">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.88px] text-muted-foreground">
              FAQ
            </p>
            <h2 className="mt-3 text-[28px] font-normal leading-[1.2] tracking-[-0.6px] text-ink sm:text-[36px] sm:tracking-[-0.72px]">
              Frequently asked questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="mt-10 w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border-hairline"
              >
                <AccordionTrigger className="text-[15px] font-semibold text-ink hover:no-underline hover:text-primary [&[data-state=open]]:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[14px] leading-[1.6] text-body">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
