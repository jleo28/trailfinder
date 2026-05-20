import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HikeFeed } from "@/components/hike/HikeFeed";
import { Skeleton } from "@/components/ui/Skeleton";
import type { FeedHike } from "@/components/hike/HikeLogCard";

export const metadata: Metadata = { title: "Feed" };

async function getFeedData(userId: string) {
  const supabase = await createClient();

  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq("status", "accepted");

  const friendIds = (friendships ?? []).map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );
  const userIds = [userId, ...friendIds];

  const { data } = await supabase
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
    .limit(10);

  return { userIds, hikes: (data ?? []) as unknown as FeedHike[] };
}

function FeedSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border overflow-hidden">
          <Skeleton className="h-16 rounded-none" />
          <Skeleton className="h-48 rounded-none" />
          <Skeleton className="h-12 rounded-none" />
        </div>
      ))}
    </div>
  );
}

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin?redirect=/feed");

  const { userIds, hikes } = await getFeedData(user.id);

  return (
    <div className="max-w-[680px] mx-auto px-6 py-10">
      <h1 className="font-serif text-3xl font-medium text-text mb-8">Feed</h1>
      <Suspense fallback={<FeedSkeleton />}>
        <HikeFeed initialHikes={hikes} userIds={userIds} currentUserId={user.id} />
      </Suspense>
    </div>
  );
}

export { getFeedData };
