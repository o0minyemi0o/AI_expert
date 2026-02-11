export interface LectureProgress {
  lectureId: string;
  courseId: string;
  completed: boolean;
  completedAt?: string;
}

export interface QuizAttempt {
  quizId: string;
  courseId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  attemptedAt: string;
}

export interface CourseProgress {
  courseId: string;
  startedAt?: string;
  completedAt?: string;
  lecturesCompleted: number;
  totalLectures: number;
  quizBestScore?: number;
  percentComplete: number;
}

export interface UserProgress {
  lectures: Record<string, LectureProgress>;
  quizAttempts: QuizAttempt[];
  achievements: string[];
  lastActiveDate: string;
  streakDays: number;
  totalTimeMinutes: number;
}
