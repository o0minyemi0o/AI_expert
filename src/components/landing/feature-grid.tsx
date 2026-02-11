import { SectionHeading } from "@/components/shared/section-heading";
import { GlowCard } from "@/components/shared/glow-card";
import { Map, BookOpenCheck, Trophy, FlaskConical } from "lucide-react";

const features = [
  {
    icon: Map,
    title: "Interactive Roadmap",
    description:
      "Visual learning path with prerequisite tracking. See exactly where you are and what to learn next.",
    color: "cyan" as const,
  },
  {
    icon: BookOpenCheck,
    title: "Research-Level Content",
    description:
      "Graduate-level lectures with LaTeX math, code examples, and references to key papers.",
    color: "purple" as const,
  },
  {
    icon: FlaskConical,
    title: "Hands-On Exercises",
    description:
      "Coding challenges and mathematical proofs that solidify your understanding of core concepts.",
    color: "blue" as const,
  },
  {
    icon: Trophy,
    title: "Progress Tracking",
    description:
      "Track your learning with dashboards, achievement badges, streak tracking, and quiz scores.",
    color: "amber" as const,
  },
];

export function FeatureGrid() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          badge="Features"
          title="Built for"
          highlightedTitle="Deep Learning"
          description="Not another surface-level tutorial. Every feature is designed for serious, sustained study."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <GlowCard
              key={feature.title}
              glowColor={feature.color}
              className="flex gap-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <feature.icon className="h-6 w-6 text-neon-cyan" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
