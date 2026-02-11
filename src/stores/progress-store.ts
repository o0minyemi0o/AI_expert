"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LectureProgress, QuizAttempt } from "@/types/progress";
import { courses } from "@/data/courses";

interface ProgressState {
  lectures: Record<string, LectureProgress>;
  quizAttempts: QuizAttempt[];
  achievements: string[];
  lastActiveDate: string;
  streakDays: number;

  // Actions
  toggleLecture: (courseId: string, lectureId: string) => void;
  recordQuizAttempt: (attempt: QuizAttempt) => void;
  unlockAchievement: (id: string) => void;

  // Getters
  getCourseProgress: (courseId: string) => number;
  getCompletedLectureCount: (courseId: string) => number;
  getOverallProgress: () => number;
  isPrerequisiteMet: (courseId: string) => boolean;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      lectures: {},
      quizAttempts: [],
      achievements: [],
      lastActiveDate: new Date().toISOString().split("T")[0],
      streakDays: 0,

      toggleLecture: (courseId, lectureId) => {
        const key = `${courseId}::${lectureId}`;
        set((state) => {
          const existing = state.lectures[key];
          if (existing?.completed) {
            const { [key]: _, ...rest } = state.lectures;
            return { lectures: rest };
          }
          return {
            lectures: {
              ...state.lectures,
              [key]: {
                lectureId,
                courseId,
                completed: true,
                completedAt: new Date().toISOString(),
              },
            },
            lastActiveDate: new Date().toISOString().split("T")[0],
          };
        });
      },

      recordQuizAttempt: (attempt) => {
        set((state) => ({
          quizAttempts: [...state.quizAttempts, attempt],
        }));
      },

      unlockAchievement: (id) => {
        set((state) => ({
          achievements: state.achievements.includes(id)
            ? state.achievements
            : [...state.achievements, id],
        }));
      },

      getCourseProgress: (courseId) => {
        const state = get();
        const course = courses.find((c) => c.id === courseId);
        if (!course) return 0;
        const completed = Object.values(state.lectures).filter(
          (l) => l.courseId === courseId && l.completed
        ).length;
        return Math.round((completed / course.lectureCount) * 100);
      },

      getCompletedLectureCount: (courseId) => {
        const state = get();
        return Object.values(state.lectures).filter(
          (l) => l.courseId === courseId && l.completed
        ).length;
      },

      getOverallProgress: () => {
        const state = get();
        const totalLectures = courses.reduce(
          (sum, c) => sum + c.lectureCount,
          0
        );
        const completed = Object.values(state.lectures).filter(
          (l) => l.completed
        ).length;
        return totalLectures > 0
          ? Math.round((completed / totalLectures) * 100)
          : 0;
      },

      isPrerequisiteMet: (courseId) => {
        const state = get();
        const course = courses.find((c) => c.id === courseId);
        if (!course || course.prerequisites.length === 0) return true;
        return course.prerequisites.every((prereqId) => {
          return state.getCourseProgress(prereqId) >= 80;
        });
      },
    }),
    {
      name: "ai-expert-progress",
      skipHydration: true,
    }
  )
);
