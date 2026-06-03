import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type Difficulty = Database["public"]["Enums"]["difficulty"];

const config: Record<Difficulty, { label: string; className: string }> = {
  easy: { label: "Easy", className: "bg-sage-300 text-sage-800" },
  moderate: { label: "Moderate", className: "bg-mushroom-300 text-mushroom-800" },
  hard: { label: "Hard", className: "bg-[#A14A3A] text-white" },
};

export function DifficultyChip({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  const { label, className: colorClass } = config[difficulty];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium leading-none",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
