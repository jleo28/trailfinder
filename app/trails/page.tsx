import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TrailBrowse } from "@/components/trail/TrailBrowse";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Browse Trails",
  description: "Explore hiking trails across the Los Angeles area — Griffith Park, Santa Monica Mountains, San Gabriels, and beyond.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function BrowseFallback() {
  return (
    <div className="flex flex-1 min-h-0">
      <Skeleton className="hidden lg:block lg:w-[60%] h-full rounded-none" />
      <div className="w-full lg:w-[40%] p-5 space-y-5">
        <Skeleton className="h-32 w-full rounded-lg" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default async function TrailsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const get = (key: string) => {
    const v = params[key];
    return typeof v === "string" ? v : undefined;
  };

  const supabase = await createClient();
  let q = supabase
    .from("trails")
    .select(
      "id, slug, name, difficulty, distance_mi, elevation_gain_ft, route_type, tags, hero_photo_url, trailhead_lat, trailhead_lng"
    )
    .order("name");

  const difficulty = get("difficulty")?.split(",").filter(Boolean) ?? [];
  if (difficulty.length > 0) {
    q = q.in("difficulty", difficulty as ("easy" | "moderate" | "hard")[]);
  }

  const tags = get("tags")?.split(",").filter(Boolean) ?? [];
  if (tags.length > 0) {
    q = q.overlaps("tags", tags);
  }

  const distanceMax = Number(get("distance_max") ?? 20);
  if (distanceMax < 20) q = q.lte("distance_mi", distanceMax);

  const elevationMax = Number(get("elevation_max") ?? 5000);
  if (elevationMax < 5000) q = q.lte("elevation_gain_ft", elevationMax);

  const { data } = await q;

  return (
    <Suspense fallback={<BrowseFallback />}>
      <TrailBrowse initialTrails={(data ?? []) as Parameters<typeof TrailBrowse>[0]["initialTrails"]} />
    </Suspense>
  );
}
