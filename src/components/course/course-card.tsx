import Link from "next/link";
import { cn } from "@/lib/utils";
import { Clock, BookOpen } from "lucide-react";
import type { Course } from "@/types/curriculum";
import { getCategoryById } from "@/data/categories";

const colorClasses: Record<string, string> = {
  "neon-cyan": "border-neon-cyan/20 text-neon-cyan",
  "neon-purple": "border-neon-purple/20 text-neon-purple",
  "neon-blue": "border-neon-blue/20 text-neon-blue",
  "neon-green": "border-neon-green/20 text-neon-green",
  "neon-amber": "border-neon-amber/20 text-neon-amber",
  "neon-pink": "border-neon-pink/20 text-neon-pink",
  "neon-teal": "border-neon-teal/20 text-neon-teal",
  "neon-orange": "border-neon-orange/20 text-neon-orange",
};

const difficultyConfig: Record<string, { label: string; className: string }> = {
  advanced: { label: "Advanced", className: "bg-neon-green/10 text-neon-green border-neon-green/20" },
  expert: { label: "Expert", className: "bg-neon-amber/10 text-neon-amber border-neon-amber/20" },
  research: { label: "Research", className: "bg-neon-pink/10 text-neon-pink border-neon-pink/20" },
};

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const category = getCategoryById(course.categoryId);
  const diff = difficultyConfig[course.difficulty];

  return (
    <Link href={`/courses/${course.id}`}>
      <div className="group h-full rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.04] cursor-pointer">
        {/* Top row: category + difficulty */}
        <div className="flex items-center justify-between gap-2">
          {category && (
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                colorClasses[category.color]
              )}
            >
              {category.shortTitle}
            </span>
          )}
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
              diff?.className
            )}
          >
            {diff?.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-3 text-base font-semibold leading-snug group-hover:text-foreground transition-colors">
          {course.title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {course.description}
        </p>

        {/* Meta */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {course.lectureCount} lectures
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {course.estimatedHours}h
          </span>
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {course.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
