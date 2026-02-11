"use client";

import { useMemo } from "react";
import { courses } from "@/data/courses";
import { categories } from "@/data/categories";
import { lectures } from "@/data/lectures";
import { useProgressStore } from "@/stores/progress-store";
import { useHydration } from "@/hooks/use-hydration";
import { GlowCard } from "@/components/shared/glow-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { GradientText } from "@/components/shared/gradient-text";
import {
  BookOpen,
  Clock,
  Flame,
  Trophy,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const colorVarMap: Record<string, string> = {
  "neon-cyan": "bg-neon-cyan",
  "neon-purple": "bg-neon-purple",
  "neon-blue": "bg-neon-blue",
  "neon-green": "bg-neon-green",
  "neon-amber": "bg-neon-amber",
  "neon-pink": "bg-neon-pink",
  "neon-teal": "bg-neon-teal",
  "neon-orange": "bg-neon-orange",
};

export default function DashboardPage() {
  const hydrated = useHydration();
  const progress = useProgressStore();

  const stats = useMemo(() => {
    if (!hydrated) {
      return {
        completedLectures: 0,
        totalLectures: 0,
        completedCourses: 0,
        totalCourses: courses.length,
        streakDays: 0,
        overallPercent: 0,
      };
    }

    const completedLectures = Object.values(progress.lectures).filter(
      (l) => l.completed
    ).length;
    const totalLectures = courses.reduce(
      (sum, c) => sum + c.lectureCount,
      0
    );
    const completedCourses = courses.filter(
      (c) => progress.getCourseProgress(c.id) === 100
    ).length;

    return {
      completedLectures,
      totalLectures,
      completedCourses,
      totalCourses: courses.length,
      streakDays: progress.streakDays,
      overallPercent:
        totalLectures > 0
          ? Math.round((completedLectures / totalLectures) * 100)
          : 0,
    };
  }, [hydrated, progress]);

  const categoryProgress = useMemo(() => {
    return categories.map((cat) => {
      const catCourses = courses.filter((c) => c.categoryId === cat.id);
      const totalLectures = catCourses.reduce(
        (sum, c) => sum + c.lectureCount,
        0
      );
      const completedLectures = hydrated
        ? Object.values(progress.lectures).filter(
            (l) => l.completed && catCourses.some((c) => c.id === l.courseId)
          ).length
        : 0;
      const percent =
        totalLectures > 0
          ? Math.round((completedLectures / totalLectures) * 100)
          : 0;
      return { ...cat, completedLectures, totalLectures, percent };
    });
  }, [hydrated, progress]);

  const recentActivity = useMemo(() => {
    if (!hydrated) return [];
    return Object.values(progress.lectures)
      .filter((l) => l.completed && l.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() -
          new Date(a.completedAt!).getTime()
      )
      .slice(0, 8)
      .map((l) => {
        const lecture = lectures.find(
          (lec) => lec.courseId === l.courseId && lec.id === l.lectureId
        );
        const course = courses.find((c) => c.id === l.courseId);
        return { ...l, lectureTitle: lecture?.title, courseTitle: course?.title };
      });
  }, [hydrated, progress]);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          badge="Dashboard"
          title="Your"
          highlightedTitle="Progress"
        />

        {/* Stats Cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlowCard glowColor="cyan">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-cyan/10 border border-neon-cyan/20">
                <BookOpen className="h-5 w-5 text-neon-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.completedLectures}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{stats.totalLectures}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Lectures Completed
                </p>
              </div>
            </div>
          </GlowCard>

          <GlowCard glowColor="purple">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-purple/10 border border-neon-purple/20">
                <Trophy className="h-5 w-5 text-neon-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.completedCourses}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{stats.totalCourses}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Courses Completed
                </p>
              </div>
            </div>
          </GlowCard>

          <GlowCard glowColor="amber">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-amber/10 border border-neon-amber/20">
                <Flame className="h-5 w-5 text-neon-amber" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.streakDays}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </GlowCard>

          <GlowCard glowColor="blue">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-blue/10 border border-neon-blue/20">
                <Clock className="h-5 w-5 text-neon-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overallPercent}%</p>
                <p className="text-xs text-muted-foreground">
                  Overall Progress
                </p>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Main content grid */}
        <div className="mt-10 grid gap-8 lg:grid-cols-5">
          {/* Category Progress */}
          <div className="lg:col-span-3">
            <GlowCard glowColor="purple" hoverable={false}>
              <h3 className="text-base font-semibold mb-6">
                <GradientText>Category Progress</GradientText>
              </h3>
              <div className="space-y-4">
                {categoryProgress.map((cat) => (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{cat.shortTitle}</span>
                      <span className="text-xs text-muted-foreground">
                        {cat.completedLectures}/{cat.totalLectures} lectures
                        <span className="ml-2 font-medium text-foreground">
                          {cat.percent}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/5">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          colorVarMap[cat.color]
                        )}
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <GlowCard glowColor="cyan" hoverable={false}>
              <h3 className="text-base font-semibold mb-6">
                <GradientText>Recent Activity</GradientText>
              </h3>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No activity yet. Start learning!
                  </p>
                  <Link
                    href="/courses"
                    className="mt-3 inline-flex items-center gap-1 text-sm text-neon-cyan hover:underline"
                  >
                    Browse courses
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity, i) => (
                    <Link
                      key={i}
                      href={`/courses/${activity.courseId}/lectures/${activity.lectureId}`}
                      className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neon-green/10">
                        <BookOpen className="h-4 w-4 text-neon-green" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {activity.lectureTitle}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {activity.courseTitle}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </GlowCard>
          </div>
        </div>

        {/* Recommended Next */}
        <div className="mt-8">
          <GlowCard glowColor="cyan" hoverable={false}>
            <h3 className="text-base font-semibold mb-6">
              <GradientText>Recommended Next</GradientText>
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {courses
                .filter((c) => {
                  if (!hydrated) return c.prerequisites.length === 0;
                  const prog = progress.getCourseProgress(c.id);
                  return prog < 100 && progress.isPrerequisiteMet(c.id);
                })
                .slice(0, 3)
                .map((course) => (
                  <Link key={course.id} href={`/courses/${course.id}`}>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.05] hover:border-white/15 transition-all cursor-pointer">
                      <h4 className="text-sm font-semibold">{course.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{course.lectureCount} lectures</span>
                        <span className="text-neon-cyan flex items-center gap-1">
                          Start
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}
