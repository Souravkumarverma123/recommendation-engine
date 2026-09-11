import { NavBar } from "./nav-bar";
import { Hero } from "./hero";
import { ProblemSection } from "./problem-section";
import { PipelineSection } from "./pipeline-section";
import { FeaturesSection } from "./features-section";
import { ComparisonSection } from "./comparison-section";
import { CtaBand } from "./cta-band";
import { Footer } from "./footer";

export function LandingPage() {
  return (
    <div className="bg-canvas">
      <NavBar />
      <main>
        <Hero />
        <ProblemSection />
        <PipelineSection />
        <FeaturesSection />
        <ComparisonSection />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}
