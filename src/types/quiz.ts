export type QuestionType = "multiple-choice" | "code-output" | "true-false";

export interface QuizOption {
  id: string;
  text: string;
  code?: string;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  code?: string;
  codeLanguage?: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  difficulty: "medium" | "hard" | "expert";
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  questions: QuizQuestion[];
  passingScore: number;
}
