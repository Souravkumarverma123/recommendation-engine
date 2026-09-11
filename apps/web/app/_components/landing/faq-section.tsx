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
    q: "How is this different from searching the BIS portal myself?",
    a: "The BIS portal lets you search the catalogue by name. It doesn't tell you which standards apply to your specification, or whether certification is legally mandatory. Manak answers both — and checks the second one independently, every time.",
  },
  {
    q: "How do you decide a standard is mandatory versus voluntary?",
    a: "By running a separate query against the Quality Control Order layer for the product itself. It is never inferred from the fact that a standard exists — “no QCO found” is a verified result, not an absence of information.",
  },
  {
    q: "What happens if I've cited a standard that's been withdrawn?",
    a: "Version resolution follows supersession — even when the replacement has a different or lower number, or is now part of another standard — and flags it as a gap warning so you correct the citation before the tender is published.",
  },
  {
    q: "Can I use this in Hindi?",
    a: "Yes. Describe the requirement in Hindi and the explanation, gap warnings, and draft clause come back in Hindi. Standard designations and titles stay in their canonical form regardless of query language.",
  },
  {
    q: "Can I trust a citation enough to paste it into a tender?",
    a: "Every standard number shown is checked against the harvested BIS catalogue, and every designation the reasoning step drafts is verified against that check before it reaches you. It cannot show you a standard that doesn't exist.",
  },
  {
    q: "What if my requirement doesn't map to a standard cleanly?",
    a: "You'll see that directly, rather than a confident guess. A requirement that doesn't map to a clear match is reported as needing manual review, not silently forced into the nearest candidate.",
  },
  {
    q: "What are allied standards, and why do they matter?",
    a: "The normative references, test methods, safety, and terminology standards a recommended standard depends on — found by walking the standard's cross-reference graph, each tagged by role so you know where it belongs in the specification.",
  },
];

export function FaqSection() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section id="faq" className="border-t border-hairline bg-surface-card/40">
      <div
        ref={ref}
        className="reveal mx-auto max-w-3xl px-5 py-20 md:px-8 md:py-28"
      >
        <h2 className="text-[28px] leading-[1.15] font-semibold tracking-tight text-ink md:text-[34px]">
          Questions a procurement officer actually asks.
        </h2>

        <Accordion type="single" collapsible className="mt-10 w-full">
          {FAQS.map((item, i) => (
            <AccordionItem
              key={item.q}
              value={`item-${i}`}
              className="border-hairline py-1"
            >
              <AccordionTrigger className="text-left text-[15px] font-medium text-ink hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-[14px] leading-[1.65] text-body">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
