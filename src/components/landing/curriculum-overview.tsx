import { categories } from "@/data/categories";
import { courses } from "@/data/courses";
import { SectionHeading } from "@/components/shared/section-heading";
import { GlowCard } from "@/components/shared/glow-card";
import {
  Code,
  Sigma,
  BarChart3,
  Database,
  GitBranch,
  Cpu,
  Cog,
  Rocket,
} from "lucide-react";
import Link from "next/link";

const iconMap: Record<string, React.ElementType> = {
  Code,
  Sigma,
  BarChart3,
  Database,
  GitBranch,
  Cpu,
  Cog,
  Rocket,
};

const colorMap: Record<string, string> = {
  "neon-cyan": "text-neon-cyan border-neon-cyan/20 bg-neon-cyan/10",
  "neon-purple": "text-neon-purple border-neon-purple/20 bg-neon-purple/10",
  "neon-blue": "text-neon-blue border-neon-blue/20 bg-neon-blue/10",
  "neon-green": "text-neon-green border-neon-green/20 bg-neon-green/10",
  "neon-amber": "text-neon-amber border-neon-amber/20 bg-neon-amber/10",
  "neon-pink": "text-neon-pink border-neon-pink/20 bg-neon-pink/10",
  "neon-teal": "text-neon-teal border-neon-teal/20 bg-neon-teal/10",
  "neon-orange": "text-neon-orange border-neon-orange/20 bg-neon-orange/10",
};

const glowColorMap: Record<string, "cyan" | "purple" | "blue" | "pink" | "green" | "amber"> = {
  "neon-cyan": "cyan",
  "neon-purple": "purple",
  "neon-blue": "blue",
  "neon-green": "green",
  "neon-amber": "amber",
  "neon-pink": "pink",
  "neon-teal": "cyan",
  "neon-orange": "amber",
};

export function CurriculumOverview() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          badge="Curriculum"
          title="8 Pillars of"
          highlightedTitle="AI Mastery"
          description="A complete, interconnected curriculum from mathematical foundations to production AI systems."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const Icon = iconMap[category.icon] || Code;
            const courseCount = courses.filter(
              (c) => c.categoryId === category.id
            ).length;
            const totalHours = courses
              .filter((c) => c.categoryId === category.id)
              .reduce((sum, c) => sum + c.estimatedHours, 0);

            return (
              <Link key={category.id} href={`/courses?category=${category.id}`}>
                <GlowCard
                  glowColor={glowColorMap[category.color] || "cyan"}
                  className="h-full group cursor-pointer"
                >
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${colorMap[category.color]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold group-hover:text-foreground transition-colors">
                    {category.shortTitle}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {category.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{courseCount} courses</span>
                    <span className="text-border">|</span>
                    <span>{totalHours}h</span>
                  </div>
                </GlowCard>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
