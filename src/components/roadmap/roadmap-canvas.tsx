"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { roadmapNodes, roadmapEdges } from "@/data/roadmap-layout";
import { CourseNode } from "./course-node";

const nodeTypes: NodeTypes = {
  courseNode: CourseNode,
};

const defaultEdgeOptions = {
  style: {
    stroke: "rgba(255,255,255,0.08)",
    strokeWidth: 1.5,
  },
  animated: false,
};

export function RoadmapCanvas() {
  const initialNodes = useMemo(() => roadmapNodes, []);
  const initialEdges = useMemo(() => roadmapEdges, []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onInit = useCallback((instance: { fitView: () => void }) => {
    instance.fitView();
  }, []);

  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.03)"
        />
        <Controls
          className="!bg-[#0f1225] !border-white/10 !shadow-lg [&_button]:!bg-[#0f1225] [&_button]:!border-white/10 [&_button]:!text-white [&_button:hover]:!bg-white/10"
        />
        <MiniMap
          className="!bg-[#0f1225] !border-white/10"
          nodeColor={(node) => {
            const data = node.data as { color?: string };
            return data?.color || "#666";
          }}
          maskColor="rgba(0,0,0,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
