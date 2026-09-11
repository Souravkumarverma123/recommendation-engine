import { Hero } from "~/app/_components/landing/hero";
import { MechanismSection } from "~/app/_components/landing/mechanism-section";
import { ProofSection } from "~/app/_components/landing/proof-section";
import { CapabilitiesSection } from "~/app/_components/landing/capabilities-section";
import { FaqSection } from "~/app/_components/landing/faq-section";
import { CtaBand } from "~/app/_components/landing/cta-band";
import { Footer } from "~/app/_components/landing/footer";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Hero />
      <MechanismSection />
      <ProofSection />
      <CapabilitiesSection />
      <FaqSection />
      <CtaBand />
      <Footer />
    </div>
  );
}
