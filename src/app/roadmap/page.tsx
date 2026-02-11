"use client";

import dynamic from "next/dynamic";
import { SectionHeading } from "@/components/shared/section-heading";

const RoadmapCanvas = dynamic(
  () =>
    import("@/components/roadmap/roadmap-canvas").then(
      (mod) => mod.RoadmapCanvas
    ),
  { ssr: false, loading: () => <RoadmapSkeleton /> }
);

function RoadmapSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
        <p className="mt-4 text-sm text-muted-foreground">
          Loading roadmap...
        </p>
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <div className="relative">
      <div className="absolute top-4 left-0 right-0 z-10 pointer-events-none">
        <SectionHeading
          badge="Learning Path"
          title="Curriculum"
          highlightedTitle="Roadmap"
          description="Click any node to explore. Courses flow left to right, from foundations to specializations."
        />
      </div>
      <RoadmapCanvas />
    </div>
  );
}
