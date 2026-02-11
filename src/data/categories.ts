import type { Category } from "@/types/curriculum";

export const categories: Category[] = [
  {
    id: "coding",
    title: "Coding Fundamentals",
    shortTitle: "Coding",
    description:
      "Advanced Python, software engineering patterns, and systems programming for AI engineers.",
    icon: "Code",
    color: "neon-cyan",
    order: 1,
  },
  {
    id: "mathematics",
    title: "Mathematics for AI",
    shortTitle: "Math",
    description:
      "Graduate-level linear algebra, optimization, probability theory, and numerical methods.",
    icon: "Sigma",
    color: "neon-purple",
    order: 2,
  },
  {
    id: "statistics",
    title: "Statistics & Data Analysis",
    shortTitle: "Stats",
    description:
      "Advanced inference, causal reasoning, experimental design, and time series analysis.",
    icon: "BarChart3",
    color: "neon-blue",
    order: 3,
  },
  {
    id: "sql-data-eng",
    title: "SQL & Data Engineering",
    shortTitle: "SQL/DE",
    description:
      "Advanced SQL, database internals, and production data pipeline architecture.",
    icon: "Database",
    color: "neon-green",
    order: 4,
  },
  {
    id: "algorithms",
    title: "Algorithms & Data Structures",
    shortTitle: "Algo",
    description:
      "Advanced data structures, graph algorithms, and algorithm design paradigms.",
    icon: "GitBranch",
    color: "neon-amber",
    order: 5,
  },
  {
    id: "machine-learning",
    title: "Machine Learning",
    shortTitle: "ML",
    description:
      "From classical methods to deep learning theory, optimization, and generalization.",
    icon: "Cpu",
    color: "neon-pink",
    order: 6,
  },
  {
    id: "ai-engineering",
    title: "AI Engineering & MLOps",
    shortTitle: "MLOps",
    description:
      "Distributed training, model serving, and production ML system design.",
    icon: "Cog",
    color: "neon-teal",
    order: 7,
  },
  {
    id: "specialization",
    title: "Specialization Tracks",
    shortTitle: "Spec",
    description:
      "Deep dives into NLP/LLM, Computer Vision, Reinforcement Learning, and Multimodal AI.",
    icon: "Rocket",
    color: "neon-orange",
    order: 8,
  },
];

export function getCategoryById(id: string) {
  return categories.find((c) => c.id === id);
}
