import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TrailGrid } from "@/components/trail/TrailGrid";
import { DifficultyChip } from "@/components/trail/DifficultyChip";
import { FriendButton } from "@/components/social/FriendButton";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

type Tab = "hikes" | "trails" | "stamps";

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("username", username)
    .maybeSingle();
  if (!data) return {};
  return { title: `${data.display_name} (@${username})` };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "trails" || tabParam === "stamps" ? tabParam : "hikes";

  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, location")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const isOwnProfile = viewer?.id === profile.id;

  // ── Friendship status (if viewer is signed in and not own profile) ─────────
  let friendStatus: "none" | "friends" | "outgoing" | "incoming" = "none";
  let friendshipId: string | undefined;
  if (viewer && !isOwnProfile) {
    const { data: fs } = await supabase
      .from("friendships")
      .select("id, status, requester_id")
      .or(
        `and(requester_id.eq.${viewer.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${viewer.id})`
      )
      .maybeSingle();

    if (fs) {
      friendshipId = fs.id;
      if (fs.status === "accepted") friendStatus = "friends";
      else if (fs.requester_id === viewer.id) friendStatus = "outgoing";
      else friendStatus = "incoming";
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [{ count: hikeCount }, { count: friendCount }, { data: hikeDistances }] =
    await Promise.all([
      supabase
        .from("hikes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id),
      supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`),
      supabase
        .from("hikes")
        .select("trail:trails!hikes_trail_id_fkey(distance_mi)")
        .eq("user_id", profile.id),
    ]);

  type DistRow = { trail: { distance_mi: number } | { distance_mi: number }[] | null };
  const totalMiles = (hikeDistances as DistRow[] | null)?.reduce((sum, h) => {
    const t = Array.isArray(h.trail) ? h.trail[0] : h.trail;
    return sum + (t?.distance_mi ?? 0);
  }, 0) ?? 0;

  // ── Tab data ──────────────────────────────────────────────────────────────
  type HikeRow = {
    id: string;
    hiked_at: string;
    trail: { id: string; slug: string; name: string; difficulty: "easy" | "moderate" | "hard"; distance_mi: number; hero_photo_url: string | null } | null | { id: string; slug: string; name: string; difficulty: "easy" | "moderate" | "hard"; distance_mi: number; hero_photo_url: string | null }[];
  };

  let recentHikes: HikeRow[] = [];
  let uniqueTrails: Parameters<typeof TrailGrid>[0]["trails"] = [];

  if (tab === "hikes" || tab === "trails") {
    const { data: hikes } = await supabase
      .from("hikes")
      .select(
        "id, hiked_at, trail:trails!hikes_trail_id_fkey(id, slug, name, difficulty, distance_mi, elevation_gain_ft, route_type, tags, hero_photo_url)"
      )
      .eq("user_id", profile.id)
      .order("hiked_at", { ascending: false })
      .limit(tab === "hikes" ? 12 : 100);

    recentHikes = (hikes ?? []) as HikeRow[];

    if (tab === "trails") {
      const seen = new Set<string>();
      uniqueTrails = recentHikes
        .map((h) => (Array.isArray(h.trail) ? h.trail[0] : h.trail))
        .filter((t): t is NonNullable<typeof t> => {
          if (!t || seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        }) as Parameters<typeof TrailGrid>[0]["trails"];
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "hikes", label: `Hikes` },
    { id: "trails", label: "Trails" },
    { id: "stamps", label: "Stamps" },
  ];

  return (
    <div className="max-w-[900px] mx-auto px-6 py-12">

      {/* ── Profile header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
        {/* Avatar */}
        <div className="w-[88px] h-[88px] rounded-full overflow-hidden bg-accent-soft shrink-0 flex items-center justify-center">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name}
              width={88}
              height={88}
              className="object-cover"
            />
          ) : (
            <span className="text-accent text-3xl font-medium">
              {profile.display_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
            <div>
              <h1 className="font-serif text-2xl font-medium text-text leading-tight">
                {profile.display_name}
              </h1>
              <p className="text-text-muted text-sm">@{profile.username}</p>
            </div>
            {viewer && !isOwnProfile && (
              <FriendButton
                profileId={profile.id}
                friendshipId={friendshipId}
                initialStatus={friendStatus}
              />
            )}
            {isOwnProfile && (
              <Link
                href="/settings"
                className="px-4 py-2 rounded-md border border-border text-text-soft text-sm hover:bg-surface-muted transition-colors"
              >
                Edit profile
              </Link>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm text-text-soft mt-2 leading-relaxed max-w-md">{profile.bio}</p>
          )}
          {profile.location && (
            <p className="flex items-center gap-1 text-xs text-text-muted mt-1.5">
              <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
              {profile.location}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3">
            {[
              { label: "friends", value: friendCount ?? 0 },
              { label: "hikes", value: hikeCount ?? 0 },
              { label: "miles", value: totalMiles.toFixed(1) },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="font-mono text-sm font-medium text-text">{value}</p>
                <p className="text-xs text-text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border mb-8 -mx-1">
        {tabs.map(({ id, label }) => (
          <Link
            key={id}
            href={`/u/${username}?tab=${id}`}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors duration-[150ms]",
              tab === id
                ? "text-accent border-b-2 border-accent"
                : "text-text-muted hover:text-text"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Hikes tab ─────────────────────────────────────────────────── */}
      {tab === "hikes" && (
        <div>
          {recentHikes.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-12">
              {isOwnProfile ? "You haven't logged any hikes yet." : "No hikes to show."}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentHikes.map((h) => {
                const trail = Array.isArray(h.trail) ? h.trail[0] : h.trail;
                if (!trail) return null;
                return (
                  <Link
                    key={h.id}
                    href={`/hikes/${h.id}`}
                    className="group block rounded-lg border border-border bg-surface overflow-hidden
                               hover:-translate-y-0.5 hover:shadow-md transition-[transform,box-shadow] duration-[150ms]"
                    style={{ transitionTimingFunction: "var(--ease-out)" }}
                  >
                    <div className="relative aspect-[3/2] bg-surface-muted">
                      {trail.hero_photo_url && (
                        <Image
                          src={trail.hero_photo_url}
                          alt={trail.name}
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                          className="object-cover"
                        />
                      )}
                      <DifficultyChip difficulty={trail.difficulty} className="absolute top-2 right-2" />
                    </div>
                    <div className="p-4">
                      <p className="font-serif text-base font-medium text-text line-clamp-1">{trail.name}</p>
                      <p className="font-mono text-xs text-text-muted mt-0.5">{formatDate(h.hiked_at)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Trails tab ────────────────────────────────────────────────── */}
      {tab === "trails" && (
        <div>
          {uniqueTrails.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-12">No trails hiked yet.</p>
          ) : (
            <TrailGrid trails={uniqueTrails} />
          )}
        </div>
      )}

      {/* ── Stamps tab (placeholder for T-31) ────────────────────────── */}
      {tab === "stamps" && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-text-muted">Trail passport stamps coming in T-31.</p>
        </div>
      )}

    </div>
  );
}
