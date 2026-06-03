"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { HikeLogCard, type FeedHike } from "./HikeLogCard";
import { Skeleton } from "@/components/ui/Skeleton";

const PAGE_SIZE = 10;

async function fetchFeedPage(
  userIds: string[],
  cursor: string | null
): Promise<FeedHike[]> {
  if (!userIds.length) return [];
  const supabase = createClient();

  let q = supabase
    .from("hikes")
    .select(
      `id, created_at, hiked_at, notes, conditions, visibility,
       trail:trails!hikes_trail_id_fkey(id, slug, name, difficulty, distance_mi, hero_photo_url),
       profile:profiles!hikes_user_id_fkey(id, username, display_name, avatar_url),
       reactions(type, user_id),
       comments(id)`
    )
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) q = q.lt("created_at", cursor);

  const { data } = await q;
  return (data ?? []) as unknown as FeedHike[];
}

export function HikeFeed({
  initialHikes,
  userIds,
  currentUserId,
}: {
  initialHikes: FeedHike[];
  userIds: string[];
  currentUserId: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["feed", userIds],
    queryFn: ({ pageParam }) => fetchFeedPage(userIds, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1]?.created_at ?? undefined;
    },
    initialData: { pages: [initialHikes], pageParams: [null] },
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const hikes = data?.pages.flat() ?? [];

  if (hikes.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted text-sm mb-3">Nothing in your feed yet.</p>
        <p className="text-text-muted text-xs">
          Log a hike or find friends to see their activity here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {hikes.map((hike) => (
        <HikeLogCard key={hike.id} hike={hike} currentUserId={currentUserId} />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <div className="space-y-5">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-border overflow-hidden">
              <Skeleton className="h-16 rounded-none" />
              <Skeleton className="h-48 rounded-none" />
              <Skeleton className="h-12 rounded-none" />
            </div>
          ))}
        </div>
      )}

      {!hasNextPage && hikes.length >= PAGE_SIZE && (
        <p className="text-center text-xs text-text-muted py-4">You're all caught up.</p>
      )}
    </div>
  );
}
