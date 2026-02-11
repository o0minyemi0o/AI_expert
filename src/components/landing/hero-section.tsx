"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { GradientText } from "@/components/shared/gradient-text";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pt-20 pb-16 sm:px-6 lg:px-8">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-neon-cyan/5 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-80 w-80 rounded-full bg-neon-purple/5 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/2 h-72 w-72 rounded-full bg-neon-blue/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-neon-cyan/20 bg-neon-cyan/5 px-5 py-2 text-sm font-medium text-neon-cyan animate-fade-in-up">
          <Sparkles className="h-4 w-4" />
          <span>For the Top 1% of AI Engineers</span>
        </div>

        {/* Main Heading */}
        <h1
          className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-7xl animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          Master AI at{" "}
          <GradientText>Research Depth</GradientText>
        </h1>

        {/* Subtitle */}
        <p
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          Graduate-level curriculum spanning mathematics, algorithms, machine
          learning, and MLOps. Designed for engineers and researchers who demand
          rigorous depth.
        </p>

        {/* CTA Buttons */}
        <div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <Link
            href="/roadmap"
            className="group flex h-12 items-center gap-2 rounded-xl bg-neon-cyan/90 px-8 text-sm font-semibold text-black transition-all hover:bg-neon-cyan hover:shadow-[0_0_30px_rgba(0,229,255,0.3)]"
          >
            View Roadmap
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/courses"
            className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 text-sm font-semibold transition-all hover:bg-white/10 hover:border-white/20"
          >
            Browse Courses
          </Link>
        </div>

        {/* Stats inline */}
        <div
          className="mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-12 animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          {[
            { value: "8", label: "Subject Areas" },
            { value: "28", label: "Courses" },
            { value: "330+", label: "Lectures" },
            { value: "1,100+", label: "Hours" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold gradient-text sm:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
