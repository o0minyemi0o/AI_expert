import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "cyan" | "purple" | "blue" | "pink" | "green" | "amber";
  hoverable?: boolean;
}

const glowStyles = {
  cyan: "hover:shadow-[0_0_30px_rgba(0,229,255,0.15)]",
  purple: "hover:shadow-[0_0_30px_rgba(124,58,237,0.15)]",
  blue: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
  pink: "hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]",
  green: "hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
  amber: "hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]",
};

const borderStyles = {
  cyan: "hover:border-neon-cyan/30",
  purple: "hover:border-neon-purple/30",
  blue: "hover:border-neon-blue/30",
  pink: "hover:border-neon-pink/30",
  green: "hover:border-neon-green/30",
  amber: "hover:border-neon-amber/30",
};

export function GlowCard({
  children,
  className,
  glowColor = "cyan",
  hoverable = true,
}: GlowCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 transition-all duration-300",
        hoverable && [glowStyles[glowColor], borderStyles[glowColor]],
        className
      )}
    >
      {children}
    </div>
  );
}
