"use client";

import { useOptimistic, useTransition } from "react";
import { toggleReaction } from "@/app/actions/social";
import type { Database } from "@/lib/database.types";

type ReactionType = Database["public"]["Enums"]["reaction_type"];

export interface ReactionSummary {
  type: ReactionType;
  count: number;
  hasReacted: boolean;
  topReactors: string[]; // display names, up to 5
}

const REACTION_CONFIG: Record<ReactionType, { emoji: string; label: string }> = {
  like: { emoji: "👍", label: "Like" },
  fire: { emoji: "🔥", label: "Fire" },
  summit: { emoji: "⛰️", label: "Summit" },
};

export function Reactions({
  hikeId,
  reactions,
  isSignedIn,
}: {
  hikeId: string;
  reactions: ReactionSummary[];
  isSignedIn: boolean;
}) {
  const [optimistic, addOptimistic] = useOptimistic(
    reactions,
    (
      state: ReactionSummary[],
      update: { type: ReactionType; delta: 1 | -1 }
    ) =>
      state.map((r) =>
        r.type === update.type
          ? { ...r, count: Math.max(0, r.count + update.delta), hasReacted: update.delta === 1 }
          : r
      )
  );

  const [, startTransition] = useTransition();

  function handleToggle(type: ReactionType) {
    if (!isSignedIn) return;
    const current = optimistic.find((r) => r.type === type);
    const wasReacted = current?.hasReacted ?? false;
    addOptimistic({ type, delta: wasReacted ? -1 : 1 });
    startTransition(() => {
      toggleReaction(hikeId, type);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {optimistic.map(({ type, count, hasReacted, topReactors }) => {
        const { emoji, label } = REACTION_CONFIG[type];
        return (
          <div key={type} className="relative group">
            <button
              onClick={() => handleToggle(type)}
              aria-label={`${label}${count > 0 ? ` (${count})` : ""}`}
              aria-pressed={hasReacted}
              disabled={!isSignedIn}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                "transition-all duration-[150ms]",
                hasReacted
                  ? "bg-accent text-accent-on"
                  : "bg-surface-muted text-text-soft hover:bg-surface",
                !isSignedIn ? "cursor-default opacity-70" : "cursor-pointer",
              ].join(" ")}
            >
              <span>{emoji}</span>
              {count > 0 && (
                <span className="font-mono text-xs tabular-nums">{count}</span>
              )}
            </button>

            {/* Hover: reactor names */}
            {topReactors.length > 0 && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2
                            bg-bg-elevated border border-border rounded-lg shadow-md z-10
                            opacity-0 group-hover:opacity-100 transition-opacity duration-[150ms]
                            pointer-events-none whitespace-nowrap"
              >
                <p className="text-xs text-text-muted">
                  {topReactors.join(", ")}
                  {count > topReactors.length && ` +${count - topReactors.length}`}
                </p>
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                  style={{ borderTopColor: "var(--border)" }}
                />
              </div>
            )}
          </div>
        );
      })}

      {!isSignedIn && (
        <span className="text-xs text-text-muted">Sign in to react</span>
      )}
    </div>
  );
}
