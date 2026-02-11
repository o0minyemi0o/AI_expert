import type { Node, Edge } from "@xyflow/react";

// Column positions
const COL1 = 0; // Foundations
const COL2 = 350; // Core Math/Stats
const COL3 = 700; // ML Core
const COL4 = 1050; // Applied/MLOps
const COL5 = 1400; // Specialization

// Row spacing
const ROW_GAP = 120;

// Category colors for node styling
const COLORS: Record<string, string> = {
  coding: "#00e5ff",
  mathematics: "#7c3aed",
  statistics: "#3b82f6",
  "sql-data-eng": "#10b981",
  algorithms: "#f59e0b",
  "machine-learning": "#ec4899",
  "ai-engineering": "#06b6d4",
  specialization: "#f97316",
};

export const roadmapNodes: Node[] = [
  // === Column 1: Foundations ===
  {
    id: "python-advanced",
    type: "courseNode",
    position: { x: COL1, y: 0 },
    data: {
      courseId: "python-advanced",
      title: "Advanced Python",
      categoryId: "coding",
      color: COLORS.coding,
      difficulty: "advanced",
    },
  },
  {
    id: "linear-algebra",
    type: "courseNode",
    position: { x: COL1, y: ROW_GAP * 2 },
    data: {
      courseId: "linear-algebra",
      title: "Linear Algebra",
      categoryId: "mathematics",
      color: COLORS.mathematics,
      difficulty: "advanced",
    },
  },
  {
    id: "advanced-data-structures",
    type: "courseNode",
    position: { x: COL1, y: ROW_GAP * 4 },
    data: {
      courseId: "advanced-data-structures",
      title: "Advanced DS",
      categoryId: "algorithms",
      color: COLORS.algorithms,
      difficulty: "advanced",
    },
  },
  {
    id: "advanced-sql",
    type: "courseNode",
    position: { x: COL1, y: ROW_GAP * 6 },
    data: {
      courseId: "advanced-sql",
      title: "Advanced SQL",
      categoryId: "sql-data-eng",
      color: COLORS["sql-data-eng"],
      difficulty: "advanced",
    },
  },

  // === Column 2: Core Foundations ===
  {
    id: "software-engineering",
    type: "courseNode",
    position: { x: COL2, y: -ROW_GAP * 0.5 },
    data: {
      courseId: "software-engineering",
      title: "SW Engineering for ML",
      categoryId: "coding",
      color: COLORS.coding,
      difficulty: "advanced",
    },
  },
  {
    id: "systems-programming",
    type: "courseNode",
    position: { x: COL2, y: ROW_GAP * 0.5 },
    data: {
      courseId: "systems-programming",
      title: "Systems Programming",
      categoryId: "coding",
      color: COLORS.coding,
      difficulty: "advanced",
    },
  },
  {
    id: "calculus-optimization",
    type: "courseNode",
    position: { x: COL2, y: ROW_GAP * 1.5 },
    data: {
      courseId: "calculus-optimization",
      title: "Calculus & Optimization",
      categoryId: "mathematics",
      color: COLORS.mathematics,
      difficulty: "expert",
    },
  },
  {
    id: "probability-theory",
    type: "courseNode",
    position: { x: COL2, y: ROW_GAP * 2.5 },
    data: {
      courseId: "probability-theory",
      title: "Probability Theory",
      categoryId: "mathematics",
      color: COLORS.mathematics,
      difficulty: "expert",
    },
  },
  {
    id: "graph-algorithms",
    type: "courseNode",
    position: { x: COL2, y: ROW_GAP * 3.5 },
    data: {
      courseId: "graph-algorithms",
      title: "Graph Algorithms",
      categoryId: "algorithms",
      color: COLORS.algorithms,
      difficulty: "expert",
    },
  },
  {
    id: "algorithm-design",
    type: "courseNode",
    position: { x: COL2, y: ROW_GAP * 4.5 },
    data: {
      courseId: "algorithm-design",
      title: "Algorithm Design",
      categoryId: "algorithms",
      color: COLORS.algorithms,
      difficulty: "expert",
    },
  },
  {
    id: "database-internals",
    type: "courseNode",
    position: { x: COL2, y: ROW_GAP * 5.5 },
    data: {
      courseId: "database-internals",
      title: "DB Internals",
      categoryId: "sql-data-eng",
      color: COLORS["sql-data-eng"],
      difficulty: "expert",
    },
  },
  {
    id: "data-pipelines",
    type: "courseNode",
    position: { x: COL2, y: ROW_GAP * 6.5 },
    data: {
      courseId: "data-pipelines",
      title: "Data Pipelines",
      categoryId: "sql-data-eng",
      color: COLORS["sql-data-eng"],
      difficulty: "expert",
    },
  },

  // === Column 3: Core ML + Stats ===
  {
    id: "numerical-methods",
    type: "courseNode",
    position: { x: COL3, y: ROW_GAP * 0 },
    data: {
      courseId: "numerical-methods",
      title: "Numerical Methods",
      categoryId: "mathematics",
      color: COLORS.mathematics,
      difficulty: "expert",
    },
  },
  {
    id: "statistical-inference",
    type: "courseNode",
    position: { x: COL3, y: ROW_GAP * 1 },
    data: {
      courseId: "statistical-inference",
      title: "Statistical Inference",
      categoryId: "statistics",
      color: COLORS.statistics,
      difficulty: "expert",
    },
  },
  {
    id: "classical-ml",
    type: "courseNode",
    position: { x: COL3, y: ROW_GAP * 2 },
    data: {
      courseId: "classical-ml",
      title: "Classical ML",
      categoryId: "machine-learning",
      color: COLORS["machine-learning"],
      difficulty: "expert",
    },
  },
  {
    id: "causal-inference",
    type: "courseNode",
    position: { x: COL3, y: ROW_GAP * 3.5 },
    data: {
      courseId: "causal-inference",
      title: "Causal Inference",
      categoryId: "statistics",
      color: COLORS.statistics,
      difficulty: "research",
    },
  },
  {
    id: "experimental-design",
    type: "courseNode",
    position: { x: COL3, y: ROW_GAP * 4.5 },
    data: {
      courseId: "experimental-design",
      title: "Exp. Design",
      categoryId: "statistics",
      color: COLORS.statistics,
      difficulty: "expert",
    },
  },
  {
    id: "time-series",
    type: "courseNode",
    position: { x: COL3, y: ROW_GAP * 5.5 },
    data: {
      courseId: "time-series",
      title: "Time Series",
      categoryId: "statistics",
      color: COLORS.statistics,
      difficulty: "expert",
    },
  },

  // === Column 4: Deep ML + MLOps ===
  {
    id: "deep-learning",
    type: "courseNode",
    position: { x: COL4, y: ROW_GAP * 0.5 },
    data: {
      courseId: "deep-learning",
      title: "Deep Learning",
      categoryId: "machine-learning",
      color: COLORS["machine-learning"],
      difficulty: "expert",
    },
  },
  {
    id: "generalization-theory",
    type: "courseNode",
    position: { x: COL4, y: ROW_GAP * 1.5 },
    data: {
      courseId: "generalization-theory",
      title: "Generalization Theory",
      categoryId: "machine-learning",
      color: COLORS["machine-learning"],
      difficulty: "research",
    },
  },
  {
    id: "optimization-theory",
    type: "courseNode",
    position: { x: COL4, y: ROW_GAP * 2.5 },
    data: {
      courseId: "optimization-theory",
      title: "DL Optimization",
      categoryId: "machine-learning",
      color: COLORS["machine-learning"],
      difficulty: "research",
    },
  },
  {
    id: "training-at-scale",
    type: "courseNode",
    position: { x: COL4, y: ROW_GAP * 3.5 },
    data: {
      courseId: "training-at-scale",
      title: "Training at Scale",
      categoryId: "ai-engineering",
      color: COLORS["ai-engineering"],
      difficulty: "expert",
    },
  },
  {
    id: "model-serving",
    type: "courseNode",
    position: { x: COL4, y: ROW_GAP * 4.5 },
    data: {
      courseId: "model-serving",
      title: "Model Serving",
      categoryId: "ai-engineering",
      color: COLORS["ai-engineering"],
      difficulty: "expert",
    },
  },
  {
    id: "ml-system-design",
    type: "courseNode",
    position: { x: COL4, y: ROW_GAP * 5.5 },
    data: {
      courseId: "ml-system-design",
      title: "ML System Design",
      categoryId: "ai-engineering",
      color: COLORS["ai-engineering"],
      difficulty: "expert",
    },
  },

  // === Column 5: Specializations ===
  {
    id: "nlp-llm",
    type: "courseNode",
    position: { x: COL5, y: ROW_GAP * 1 },
    data: {
      courseId: "nlp-llm",
      title: "NLP & LLMs",
      categoryId: "specialization",
      color: COLORS.specialization,
      difficulty: "expert",
    },
  },
  {
    id: "computer-vision",
    type: "courseNode",
    position: { x: COL5, y: ROW_GAP * 2.5 },
    data: {
      courseId: "computer-vision",
      title: "Computer Vision",
      categoryId: "specialization",
      color: COLORS.specialization,
      difficulty: "expert",
    },
  },
  {
    id: "reinforcement-learning",
    type: "courseNode",
    position: { x: COL5, y: ROW_GAP * 4 },
    data: {
      courseId: "reinforcement-learning",
      title: "Reinforcement Learning",
      categoryId: "specialization",
      color: COLORS.specialization,
      difficulty: "research",
    },
  },
  {
    id: "multimodal-ai",
    type: "courseNode",
    position: { x: COL5, y: ROW_GAP * 5.5 },
    data: {
      courseId: "multimodal-ai",
      title: "Multimodal AI",
      categoryId: "specialization",
      color: COLORS.specialization,
      difficulty: "research",
    },
  },
];

// Prerequisite edges
export const roadmapEdges: Edge[] = [
  // Coding dependencies
  { id: "e-py-swe", source: "python-advanced", target: "software-engineering", type: "smoothstep" },
  { id: "e-py-sys", source: "python-advanced", target: "systems-programming", type: "smoothstep" },

  // Math dependencies
  { id: "e-la-calc", source: "linear-algebra", target: "calculus-optimization", type: "smoothstep" },
  { id: "e-la-prob", source: "linear-algebra", target: "probability-theory", type: "smoothstep" },
  { id: "e-la-num", source: "linear-algebra", target: "numerical-methods", type: "smoothstep" },
  { id: "e-calc-num", source: "calculus-optimization", target: "numerical-methods", type: "smoothstep" },

  // Stats dependencies
  { id: "e-prob-inf", source: "probability-theory", target: "statistical-inference", type: "smoothstep" },
  { id: "e-inf-causal", source: "statistical-inference", target: "causal-inference", type: "smoothstep" },
  { id: "e-inf-exp", source: "statistical-inference", target: "experimental-design", type: "smoothstep" },
  { id: "e-inf-ts", source: "statistical-inference", target: "time-series", type: "smoothstep" },

  // SQL/DE dependencies
  { id: "e-sql-db", source: "advanced-sql", target: "database-internals", type: "smoothstep" },
  { id: "e-sql-pipe", source: "advanced-sql", target: "data-pipelines", type: "smoothstep" },

  // Algo dependencies
  { id: "e-ds-graph", source: "advanced-data-structures", target: "graph-algorithms", type: "smoothstep" },
  { id: "e-ds-algo", source: "advanced-data-structures", target: "algorithm-design", type: "smoothstep" },

  // ML dependencies
  { id: "e-la-ml", source: "linear-algebra", target: "classical-ml", type: "smoothstep" },
  { id: "e-prob-ml", source: "probability-theory", target: "classical-ml", type: "smoothstep" },
  { id: "e-calc-ml", source: "calculus-optimization", target: "classical-ml", type: "smoothstep" },
  { id: "e-ml-dl", source: "classical-ml", target: "deep-learning", type: "smoothstep" },
  { id: "e-calc-dl", source: "calculus-optimization", target: "deep-learning", type: "smoothstep" },
  { id: "e-ml-gen", source: "classical-ml", target: "generalization-theory", type: "smoothstep" },
  { id: "e-prob-gen", source: "probability-theory", target: "generalization-theory", type: "smoothstep" },
  { id: "e-dl-opt", source: "deep-learning", target: "optimization-theory", type: "smoothstep" },
  { id: "e-calc-opt", source: "calculus-optimization", target: "optimization-theory", type: "smoothstep" },

  // MLOps dependencies
  { id: "e-dl-train", source: "deep-learning", target: "training-at-scale", type: "smoothstep" },
  { id: "e-sys-train", source: "systems-programming", target: "training-at-scale", type: "smoothstep" },
  { id: "e-dl-serve", source: "deep-learning", target: "model-serving", type: "smoothstep" },
  { id: "e-swe-serve", source: "software-engineering", target: "model-serving", type: "smoothstep" },
  { id: "e-serve-sys", source: "model-serving", target: "ml-system-design", type: "smoothstep" },
  { id: "e-pipe-sys", source: "data-pipelines", target: "ml-system-design", type: "smoothstep" },

  // Specialization dependencies
  { id: "e-dl-nlp", source: "deep-learning", target: "nlp-llm", type: "smoothstep" },
  { id: "e-train-nlp", source: "training-at-scale", target: "nlp-llm", type: "smoothstep" },
  { id: "e-dl-cv", source: "deep-learning", target: "computer-vision", type: "smoothstep" },
  { id: "e-dl-rl", source: "deep-learning", target: "reinforcement-learning", type: "smoothstep" },
  { id: "e-calc-rl", source: "calculus-optimization", target: "reinforcement-learning", type: "smoothstep" },
  { id: "e-dl-mm", source: "deep-learning", target: "multimodal-ai", type: "smoothstep" },
  { id: "e-nlp-mm", source: "nlp-llm", target: "multimodal-ai", type: "smoothstep" },
  { id: "e-cv-mm", source: "computer-vision", target: "multimodal-ai", type: "smoothstep" },
];
