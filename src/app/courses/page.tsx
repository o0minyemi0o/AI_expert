"use client";

import { useState, useMemo } from "react";
import { courses } from "@/data/courses";
import { categories } from "@/data/categories";
import { CourseCard } from "@/components/course/course-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export default function CoursesPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredCourses = useMemo(() => {
    let result = courses;
    if (activeCategory !== "all") {
      result = result.filter((c) => c.categoryId === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.tags.some((t) => t.includes(q)) ||
          c.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeCategory, search]);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          badge="Catalog"
          title="All"
          highlightedTitle="Courses"
          description="28 courses across 8 subject areas. Filter by category or search by topic."
        />

        {/* Search bar */}
        <div className="mt-10 mx-auto max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search courses or topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-neon-cyan/30 focus:outline-none focus:ring-1 focus:ring-neon-cyan/20"
            />
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "rounded-lg px-4 py-2 text-xs font-medium transition-all",
              activeCategory === "all"
                ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
            )}
          >
            All ({courses.length})
          </button>
          {categories.map((cat) => {
            const count = courses.filter(
              (c) => c.categoryId === cat.id
            ).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-medium transition-all",
                  activeCategory === cat.id
                    ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                )}
              >
                {cat.shortTitle} ({count})
              </button>
            );
          })}
        </div>

        {/* Course grid */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <p className="mt-16 text-center text-muted-foreground">
            No courses found matching your search.
          </p>
        )}
      </div>
    </div>
  );
}
