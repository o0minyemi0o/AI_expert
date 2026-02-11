"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourseById } from "@/data/courses";
import { getCategoryById } from "@/data/categories";
import { getLecturesByCourse } from "@/data/lectures";
import { GlowCard } from "@/components/shared/glow-card";
import { GradientText } from "@/components/shared/gradient-text";
import {
  Clock,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Target,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProgressStore } from "@/stores/progress-store";
import { useHydration } from "@/hooks/use-hydration";

const difficultyConfig: Record<string, { label: string; className: string }> = {
  advanced: { label: "Advanced", className: "bg-neon-green/10 text-neon-green border-neon-green/20" },
  expert: { label: "Expert", className: "bg-neon-amber/10 text-neon-amber border-neon-amber/20" },
  research: { label: "Research", className: "bg-neon-pink/10 text-neon-pink border-neon-pink/20" },
};

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const course = getCourseById(courseId);
  const hydrated = useHydration();
  const lectures = course ? getLecturesByCourse(course.id) : [];
  const progress = useProgressStore();

  if (!course) notFound();

  const category = getCategoryById(course.categoryId);
  const diff = difficultyConfig[course.difficulty];

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Back link */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {category && (
              <span className="rounded-md border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-1 text-xs font-semibold text-neon-cyan uppercase tracking-wider">
                {category.shortTitle}
              </span>
            )}
            <span className={cn("rounded-md border px-3 py-1 text-xs font-semibold", diff?.className)}>
              {diff?.label}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {course.description}
          </p>
          <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {course.lectureCount} lectures
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {course.estimatedHours} hours
            </span>
            {hydrated && (
              <span className="flex items-center gap-1.5 text-neon-cyan">
                <Target className="h-4 w-4" />
                {progress.getCourseProgress(course.id)}% complete
              </span>
            )}
          </div>
        </div>

        {/* Learning Objectives */}
        <GlowCard className="mb-8" glowColor="purple">
          <h2 className="text-lg font-semibold mb-4">
            <GradientText>Learning Objectives</GradientText>
          </h2>
          <ul className="space-y-2">
            {course.objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Target className="h-4 w-4 mt-0.5 shrink-0 text-neon-purple" />
                {obj}
              </li>
            ))}
          </ul>
        </GlowCard>

        {/* Prerequisites */}
        {course.prerequisites.length > 0 && (
          <GlowCard className="mb-8" glowColor="amber">
            <h2 className="text-lg font-semibold mb-4">Prerequisites</h2>
            <div className="flex flex-wrap gap-2">
              {course.prerequisites.map((prereqId) => {
                const prereq = getCourseById(prereqId);
                return prereq ? (
                  <Link
                    key={prereqId}
                    href={`/courses/${prereqId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 transition-colors"
                  >
                    <LinkIcon className="h-3.5 w-3.5 text-neon-amber" />
                    {prereq.title}
                  </Link>
                ) : null;
              })}
            </div>
          </GlowCard>
        )}

        {/* Lecture List */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            <GradientText>Lectures</GradientText>
          </h2>
          <div className="space-y-2">
            {lectures.map((lecture) => {
              const key = `${course.id}::${lecture.id}`;
              const isCompleted = hydrated && progress.lectures[key]?.completed;

              return (
                <Link
                  key={lecture.id}
                  href={`/courses/${course.id}/lectures/${lecture.id}`}
                >
                  <div className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.05] hover:border-white/15 cursor-pointer">
                    {/* Completion icon */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        progress.toggleLecture(course.id, lecture.id);
                      }}
                      className="shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-neon-green" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/30 group-hover:text-muted-foreground/60" />
                      )}
                    </button>

                    {/* Order number */}
                    <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-xs font-mono text-muted-foreground">
                      {String(lecture.order).padStart(2, "0")}
                    </span>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <h3 className={cn(
                        "text-sm font-medium truncate",
                        isCompleted && "text-muted-foreground line-through"
                      )}>
                        {lecture.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {lecture.description}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="shrink-0 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{lecture.estimatedMinutes}min</span>
                      {lecture.hasQuiz && (
                        <span className="rounded bg-neon-purple/10 px-1.5 py-0.5 text-neon-purple">
                          Quiz
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div className="mt-10 flex flex-wrap gap-2">
          {course.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-white/5 border border-white/5 px-3 py-1 text-xs text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
