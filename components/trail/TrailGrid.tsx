import { cn } from "@/lib/utils";
import { TrailCard, type TrailCardFragment } from "./TrailCard";

export function TrailGrid({
  trails,
  className,
}: {
  trails: TrailCardFragment[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {trails.map((trail) => (
        <TrailCard key={trail.id} trail={trail} />
      ))}
    </div>
  );
}
