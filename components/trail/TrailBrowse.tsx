"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TrailMap } from "@/components/map/TrailMap";
import { TrailGrid } from "@/components/trail/TrailGrid";
import { TrailFilters, type FilterState } from "@/components/trail/TrailFilters";
import { useUrlState } from "@/lib/hooks/useUrlState";
import type { TrailCardFragment } from "./TrailCard";

type BrowseTrail = TrailCardFragment & {
  trailhead_lat: number;
  trailhead_lng: number;
};

function parseFilters(searchParams: URLSearchParams): FilterState {
  return {
    difficulty: searchParams.get("difficulty")?.split(",").filter(Boolean) ?? [],
    tags: searchParams.get("tags")?.split(",").filter(Boolean) ?? [],
    distanceMax: Number(searchParams.get("distance_max") ?? 20),
    elevationMax: Number(searchParams.get("elevation_max") ?? 5000),
  };
}

async function fetchTrails(filters: FilterState): Promise<BrowseTrail[]> {
  const supabase = createClient();
  let q = supabase
    .from("trails")
    .select(
      "id, slug, name, difficulty, distance_mi, elevation_gain_ft, route_type, tags, hero_photo_url, trailhead_lat, trailhead_lng"
    )
    .order("name");

  if (filters.difficulty.length > 0) {
    q = q.in("difficulty", filters.difficulty as ("easy" | "moderate" | "hard")[]);
  }
  if (filters.distanceMax < 20) {
    q = q.lte("distance_mi", filters.distanceMax);
  }
  if (filters.elevationMax < 5000) {
    q = q.lte("elevation_gain_ft", filters.elevationMax);
  }
  if (filters.tags.length > 0) {
    q = q.overlaps("tags", filters.tags);
  }

  const { data } = await q;
  return (data ?? []) as BrowseTrail[];
}

export function TrailBrowse({ initialTrails }: { initialTrails: BrowseTrail[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");
  const searchParams = useSearchParams();
  const { setParams } = useUrlState();

  const filters = parseFilters(searchParams);

  const { data: trails = initialTrails, isFetching } = useQuery({
    queryKey: ["trails", filters],
    queryFn: () => fetchTrails(filters),
    initialData: initialTrails,
  });

  const trailPins = trails.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    difficulty: t.difficulty,
    distance_mi: t.distance_mi,
    elevation_gain_ft: t.elevation_gain_ft,
    trailhead_lat: t.trailhead_lat,
    trailhead_lng: t.trailhead_lng,
    hero_photo_url: t.hero_photo_url,
  }));

  const tabBtn = (tab: "map" | "list", label: string) => (
    <button
      onClick={() => setMobileTab(tab)}
      className={[
        "flex-1 py-2.5 text-sm font-medium transition-colors",
        mobileTab === tab
          ? "text-accent border-b-2 border-accent"
          : "text-text-muted hover:text-text",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Mobile tab bar */}
      <div className="flex lg:hidden shrink-0 border-b border-border bg-bg">
        {tabBtn("map", "Map")}
        {tabBtn("list", `List (${trails.length})`)}
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div
          className={[
            "flex-col lg:flex lg:w-[60%]",
            mobileTab === "list" ? "hidden" : "flex",
          ].join(" ")}
        >
          <TrailMap
            trails={trailPins}
            selectedSlug={selectedSlug}
            onTrailSelect={setSelectedSlug}
            className="h-full w-full"
          />
        </div>

        {/* Filters + list */}
        <div
          className={[
            "flex-col lg:flex lg:w-[40%] overflow-y-auto border-l border-border",
            mobileTab === "map" ? "hidden" : "flex",
          ].join(" ")}
        >
          <TrailFilters
            filters={filters}
            onChange={setParams}
            isFetching={isFetching}
            totalCount={trails.length}
          />
          <div className="p-5">
            {trails.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-16">
                No trails match these filters.
              </p>
            ) : (
              <TrailGrid
                trails={trails}
                variant="list"
                selectedSlug={selectedSlug}
                onTrailHover={setSelectedSlug}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
