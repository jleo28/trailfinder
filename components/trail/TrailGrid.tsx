"use client";

import { cn } from "@/lib/utils";
import { TrailCard, type TrailCardFragment } from "./TrailCard";

export function TrailGrid({
  trails,
  className,
  variant = "grid",
  selectedSlug,
  onTrailHover,
}: {
  trails: TrailCardFragment[];
  className?: string;
  variant?: "grid" | "list";
  selectedSlug?: string | null;
  onTrailHover?: (slug: string | null) => void;
}) {
  const cols =
    variant === "list"
      ? "grid-cols-1"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  if (trails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="font-serif text-xl text-text-soft mb-2">No trails found.</p>
        <p className="text-sm text-text-muted">Try adjusting the filters.</p>
      </div>
    );
  }

  return (
    <div className={cn(`grid gap-6 ${cols}`, className)}>
      {trails.map((trail) => (
        <TrailCard
          key={trail.id}
          trail={trail}
          isSelected={selectedSlug === trail.slug}
          onMouseEnter={() => onTrailHover?.(trail.slug)}
          onMouseLeave={() => onTrailHover?.(null)}
        />
      ))}
    </div>
  );
}
