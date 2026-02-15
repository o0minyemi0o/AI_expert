export type CategoryId =
  | "coding"
  | "mathematics"
  | "statistics"
  | "sql-data-eng"
  | "algorithms"
  | "machine-learning"
  | "ai-engineering"
  | "specialization"
  | "interview";

export type DifficultyLevel = "advanced" | "expert" | "research";

export interface Category {
  id: CategoryId;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}

export interface Course {
  id: string;
  categoryId: CategoryId;
  title: string;
  shortTitle: string;
  description: string;
  objectives: string[];
  prerequisites: string[];
  difficulty: DifficultyLevel;
  estimatedHours: number;
  lectureCount: number;
  tags: string[];
  order: number;
}

export interface Lecture {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  hasQuiz: boolean;
  keyTopics: string[];
}

export interface Reference {
  title: string;
  url: string;
  type: "paper" | "book" | "article" | "video" | "documentation";
}
