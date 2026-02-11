import { cn } from "@/lib/utils";
import { GradientText } from "./gradient-text";

interface SectionHeadingProps {
  badge?: string;
  title: string;
  highlightedTitle?: string;
  description?: string;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  badge,
  title,
  highlightedTitle,
  description,
  className,
  align = "center",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "space-y-4",
        align === "center" && "text-center",
        className
      )}
    >
      {badge && (
        <span className="inline-block rounded-full border border-neon-cyan/20 bg-neon-cyan/5 px-4 py-1.5 text-xs font-medium tracking-wider uppercase text-neon-cyan">
          {badge}
        </span>
      )}
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        {title}{" "}
        {highlightedTitle && <GradientText>{highlightedTitle}</GradientText>}
      </h2>
      {description && (
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
