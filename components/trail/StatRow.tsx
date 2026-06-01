import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type Difficulty = Database["public"]["Enums"]["difficulty"];
type RouteType = Database["public"]["Enums"]["route_type"];

const difficultyLabel: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
};

const routeTypeLabel: Record<RouteType, string> = {
  loop: "Loop",
  out_and_back: "Out & Back",
  point_to_point: "Point to Point",
};

export function StatRow({
  distanceMi,
  elevationGainFt,
  difficulty,
  routeType,
  className,
}: {
  distanceMi: number;
  elevationGainFt: number;
  difficulty: Difficulty;
  routeType: RouteType;
  className?: string;
}) {
  const parts = [
    `${distanceMi} mi`,
    `+${elevationGainFt.toLocaleString()} ft`,
    difficultyLabel[difficulty],
    routeTypeLabel[routeType],
  ];

  return (
    // flex-wrap so the row breaks cleanly at ·-separators on narrow screens
    // instead of mid-token overflow
    <div className={cn("flex flex-wrap items-center gap-x-0 font-mono text-sm text-text-muted", className)}>
      {parts.map((part, i) => (
        <span key={i} className="flex items-center">
          {part}
          {i < parts.length - 1 && (
            <span className="mx-1.5 opacity-40" aria-hidden>·</span>
          )}
        </span>
      ))}
    </div>
  );
}
