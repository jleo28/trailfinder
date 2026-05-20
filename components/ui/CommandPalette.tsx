"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Mountain } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DifficultyChip } from "@/components/trail/DifficultyChip";
import type { Database } from "@/lib/database.types";

type Result = Pick<
  Database["public"]["Tables"]["trails"]["Row"],
  "id" | "slug" | "name" | "difficulty" | "distance_mi" | "elevation_gain_ft" | "hero_photo_url"
>;

export const OPEN_SEARCH_EVENT = "open-command-palette";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut + custom event
  useEffect(() => {
    const openPalette = () => setOpen(true);

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, openPalette);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("trails")
        .select("id, slug, name, difficulty, distance_mi, elevation_gain_ft, hero_photo_url")
        .textSearch("search_vector", query, { type: "websearch", config: "english" })
        .limit(10);

      setResults((data ?? []) as Result[]);
      setLoading(false);
      setActiveIdx(0);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Arrow key navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      navigate(results[activeIdx]!.slug);
    }
  };

  function navigate(slug: string) {
    setOpen(false);
    router.push(`/trails/${slug}`);
  }

  function close() {
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      aria-modal
      role="dialog"
      aria-label="Search trails"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={close}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-bg-elevated border border-border rounded-xl shadow-xl overflow-hidden">
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search trails…"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted outline-none"
          />
          <kbd className="shrink-0 font-mono text-xs text-text-muted border border-border rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[360px]">
          {loading && (
            <div className="px-4 py-6 text-sm text-text-muted text-center font-mono animate-pulse">
              Searching…
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <p className="px-4 py-6 text-sm text-text-muted text-center">
              No trails found for &ldquo;{query}&rdquo;.
            </p>
          )}

          {!loading && !query.trim() && (
            <p className="px-4 py-6 text-sm text-text-muted text-center">
              Type to search trails by name or description.
            </p>
          )}

          {!loading &&
            results.map((trail, i) => (
              <button
                key={trail.id}
                onClick={() => navigate(trail.slug)}
                onMouseEnter={() => setActiveIdx(i)}
                className={[
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-[100ms]",
                  i === activeIdx ? "bg-surface-muted" : "hover:bg-surface-muted",
                ].join(" ")}
              >
                {/* Thumbnail */}
                <div className="relative w-12 aspect-[4/3] rounded-md overflow-hidden bg-surface shrink-0">
                  {trail.hero_photo_url ? (
                    <Image
                      src={trail.hero_photo_url}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Mountain className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate">{trail.name}</p>
                  <p className="font-mono text-xs text-text-muted">
                    {trail.distance_mi} mi &nbsp;·&nbsp; +{trail.elevation_gain_ft.toLocaleString()} ft
                  </p>
                </div>

                <DifficultyChip difficulty={trail.difficulty} />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
