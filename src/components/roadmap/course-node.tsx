"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

interface CourseNodeData {
  courseId: string;
  title: string;
  categoryId: string;
  color: string;
  difficulty: string;
  percentComplete?: number;
  isLocked?: boolean;
}

function CourseNodeComponent({ data }: NodeProps) {
  const router = useRouter();
  const { courseId, title, color, difficulty, percentComplete = 0, isLocked } =
    data as unknown as CourseNodeData;

  const difficultyLabel: Record<string, string> = {
    advanced: "ADV",
    expert: "EXP",
    research: "RES",
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-2 !h-2" />
      <div
        onClick={() => router.push(`/courses/${courseId}`)}
        className="group relative cursor-pointer rounded-xl border border-white/[0.08] bg-[#0f1225]/90 backdrop-blur-sm px-4 py-3 transition-all duration-200 hover:border-white/20 min-w-[160px]"
        style={{
          boxShadow: `0 0 0 1px ${color}15`,
          opacity: isLocked ? 0.5 : 1,
        }}
      >
        {/* Color accent bar */}
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ backgroundColor: color }}
        />

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 z-10">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* Content */}
        <div className="pl-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground truncate">
              {title}
            </span>
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
              style={{
                backgroundColor: `${color}20`,
                color: color,
              }}
            >
              {difficultyLabel[difficulty] || difficulty}
            </span>
          </div>

          {/* Progress bar */}
          {percentComplete > 0 && (
            <div className="mt-2 h-1 w-full rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${percentComplete}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-2 !h-2" />
    </>
  );
}

export const CourseNode = memo(CourseNodeComponent);
