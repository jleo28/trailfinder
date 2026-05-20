"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
] as const;

const TAGS = [
  "loop", "dog-friendly", "views", "waterfall", "summit",
  "ocean-view", "canyon", "family", "wildflowers", "creek",
  "remote", "geology", "history", "swimming-hole", "wildlife",
  "meadow", "coastal", "strenuous",
];

export interface FilterState {
  difficulty: string[];
  tags: string[];
  distanceMax: number;
  elevationMax: number;
}

interface Props {
  filters: FilterState;
  onChange: (updates: Record<string, string | string[] | null>) => void;
  isFetching?: boolean;
  totalCount: number;
}

function formatTag(tag: string) {
  return tag.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function TrailFilters({ filters, onChange, isFetching, totalCount }: Props) {
  const [localDistance, setLocalDistance] = useState(filters.distanceMax);
  const [localElevation, setLocalElevation] = useState(filters.elevationMax);

  const hasActiveFilters =
    filters.difficulty.length > 0 ||
    filters.tags.length > 0 ||
    filters.distanceMax < 20 ||
    filters.elevationMax < 5000;

  function toggleDifficulty(value: string) {
    const next = filters.difficulty.includes(value)
      ? filters.difficulty.filter((d) => d !== value)
      : [...filters.difficulty, value];
    onChange({ difficulty: next.length ? next : null });
  }

  function toggleTag(tag: string) {
    const next = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onChange({ tags: next.length ? next : null });
  }

  function clearAll() {
    setLocalDistance(20);
    setLocalElevation(5000);
    onChange({ difficulty: null, tags: null, distance_max: null, elevation_max: null });
  }

  return (
    <div className="sticky top-0 z-10 bg-bg border-b border-border px-5 py-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-[0.06em] uppercase text-text-muted">
          {isFetching ? "Searching…" : `${totalCount} trail${totalCount !== 1 ? "s" : ""}`}
        </span>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-text-soft">Difficulty</p>
        <div className="flex gap-2">
          {DIFFICULTIES.map(({ value, label }) => {
            const active = filters.difficulty.includes(value);
            return (
              <button
                key={value}
                onClick={() => toggleDifficulty(value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors duration-[150ms]",
                  active
                    ? "bg-accent text-accent-on"
                    : "bg-surface-muted text-text-soft hover:bg-surface"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Distance */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <p className="text-xs font-medium text-text-soft">Distance</p>
          <span className="font-mono text-xs text-text-muted">
            {localDistance < 20 ? `≤ ${localDistance} mi` : "Any"}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          step={0.5}
          value={localDistance}
          onChange={(e) => setLocalDistance(Number(e.target.value))}
          onPointerUp={(e) => {
            const v = Number((e.target as HTMLInputElement).value);
            onChange({ distance_max: v < 20 ? String(v) : null });
          }}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border accent-accent"
        />
      </div>

      {/* Elevation */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <p className="text-xs font-medium text-text-soft">Elevation gain</p>
          <span className="font-mono text-xs text-text-muted">
            {localElevation < 5000 ? `≤ ${localElevation.toLocaleString()} ft` : "Any"}
          </span>
        </div>
        <input
          type="range"
          min={100}
          max={5000}
          step={100}
          value={localElevation}
          onChange={(e) => setLocalElevation(Number(e.target.value))}
          onPointerUp={(e) => {
            const v = Number((e.target as HTMLInputElement).value);
            onChange({ elevation_max: v < 5000 ? String(v) : null });
          }}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border accent-accent"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-text-soft">Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((tag) => {
            const active = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-[150ms]",
                  active
                    ? "bg-accent text-accent-on"
                    : "bg-accent-soft text-accent hover:bg-surface"
                )}
              >
                {formatTag(tag)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
