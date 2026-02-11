import { HeroSection } from "@/components/landing/hero-section";
import { CurriculumOverview } from "@/components/landing/curriculum-overview";
import { FeatureGrid } from "@/components/landing/feature-grid";

export default function Home() {
  return (
    <>
      <HeroSection />
      <CurriculumOverview />
      <FeatureGrid />
      {/* Footer */}
      <footer className="border-t border-white/5 py-10 text-center text-sm text-muted-foreground">
        <p>AI Expert Curriculum &mdash; Built for the relentless learner.</p>
      </footer>
    </>
  );
}
