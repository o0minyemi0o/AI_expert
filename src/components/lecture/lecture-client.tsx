"use client";

import Link from "next/link";
import { MarkdownRenderer } from "@/components/lecture/markdown-renderer";
import { GradientText } from "@/components/shared/gradient-text";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
} from "lucide-react";
import { useProgressStore } from "@/stores/progress-store";
import { useHydration } from "@/hooks/use-hydration";
import { cn } from "@/lib/utils";
import type { Lecture } from "@/types/curriculum";

interface LectureClientProps {
  courseId: string;
  lectureId: string;
  courseShortTitle: string;
  lecture: Lecture;
  content: string | null;
  allLectures: Lecture[];
}

export function LectureClient({
  courseId,
  lectureId,
  courseShortTitle,
  lecture,
  content,
  allLectures,
}: LectureClientProps) {
  const hydrated = useHydration();
  const progress = useProgressStore();

  const currentIndex = allLectures.findIndex((l) => l.id === lectureId);
  const prevLecture = currentIndex > 0 ? allLectures[currentIndex - 1] : null;
  const nextLecture =
    currentIndex < allLectures.length - 1
      ? allLectures[currentIndex + 1]
      : null;

  const key = `${courseId}::${lectureId}`;
  const isCompleted = hydrated && progress.lectures[key]?.completed;

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link
            href="/courses"
            className="hover:text-foreground transition-colors"
          >
            Courses
          </Link>
          <ChevronLeft className="h-3 w-3 rotate-180" />
          <Link
            href={`/courses/${courseId}`}
            className="hover:text-foreground transition-colors"
          >
            {courseShortTitle}
          </Link>
          <ChevronLeft className="h-3 w-3 rotate-180" />
          <span className="text-foreground truncate">{lecture.title}</span>
        </div>

        {/* Lecture Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 text-sm font-mono font-bold text-neon-cyan">
              {String(lecture.order).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Lecture {lecture.order} of {allLectures.length}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {lecture.title}
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            {lecture.description}
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {lecture.estimatedMinutes} min
            </span>
            {lecture.hasQuiz && (
              <span className="flex items-center gap-1.5 text-neon-purple">
                <BookOpen className="h-4 w-4" />
                Includes Quiz
              </span>
            )}
          </div>
        </div>

        {/* Key Topics */}
        <div className="mb-8 flex flex-wrap gap-2">
          {lecture.keyTopics.map((topic) => (
            <span
              key={topic}
              className="rounded-lg bg-neon-cyan/5 border border-neon-cyan/10 px-3 py-1 text-xs font-medium text-neon-cyan"
            >
              {topic}
            </span>
          ))}
        </div>

        {/* Lecture Content */}
        {content ? (
          <div className="mb-10 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 sm:p-10">
            <MarkdownRenderer content={content} />
          </div>
        ) : (
          <div className="mb-10 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-10 text-center">
            <p className="text-muted-foreground">
              This lecture content is being prepared.
            </p>
          </div>
        )}

        {/* Mark Complete Button */}
        <div className="mb-10 flex justify-center">
          <button
            onClick={() => progress.toggleLecture(courseId, lectureId)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-all",
              isCompleted
                ? "bg-neon-green/10 border border-neon-green/20 text-neon-green hover:bg-neon-green/20"
                : "bg-neon-cyan/90 text-black hover:bg-neon-cyan hover:shadow-[0_0_30px_rgba(0,229,255,0.3)]"
            )}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                Mark as Complete
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-white/5 pt-6">
          {prevLecture ? (
            <Link
              href={`/courses/${courseId}/lectures/${prevLecture.id}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  Previous
                </div>
                <div className="font-medium">{prevLecture.title}</div>
              </div>
            </Link>
          ) : (
            <div />
          )}
          {nextLecture ? (
            <Link
              href={`/courses/${courseId}/lectures/${nextLecture.id}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  Next
                </div>
                <div className="font-medium">{nextLecture.title}</div>
              </div>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
