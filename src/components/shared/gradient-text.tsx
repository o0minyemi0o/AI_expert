import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  variant?: "cool" | "warm";
}

export function GradientText({
  children,
  className,
  variant = "cool",
}: GradientTextProps) {
  return (
    <span
      className={cn(
        variant === "cool" ? "gradient-text" : "gradient-text-warm",
        className
      )}
    >
      {children}
    </span>
  );
}
