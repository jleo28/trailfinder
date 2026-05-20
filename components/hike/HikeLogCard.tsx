import Link from "next/link";
import Image from "next/image";
import { Reactions, type ReactionSummary } from "@/components/hike/Reactions";

export interface FeedHike {
  id: string;
  created_at: string;
  hiked_at: string;
  notes: string | null;
  conditions: string | null;
  visibility: string;
  trail: {
    id: string;
    slug: string;
    name: string;
    difficulty: "easy" | "moderate" | "hard";
    distance_mi: number;
    hero_photo_url: string | null;
  } | null;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  reactions: { type: "like" | "fire" | "summit"; user_id: string }[];
  comments: { id: string }[];
}

const REACTION_TYPES = ["like", "fire", "summit"] as const;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function HikeLogCard({
  hike,
  currentUserId,
}: {
  hike: FeedHike;
  currentUserId: string | null;
}) {
  const trail = hike.trail;
  const profile = hike.profile;

  const reactionSummaries: ReactionSummary[] = REACTION_TYPES.map((type) => ({
    type,
    count: hike.reactions.filter((r) => r.type === type).length,
    hasReacted: hike.reactions.some(
      (r) => r.type === type && r.user_id === currentUserId
    ),
    topReactors: [],
  }));

  return (
    <article className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Header: user + date */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-accent-soft shrink-0 flex items-center justify-center">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name}
              width={32}
              height={32}
              className="object-cover"
            />
          ) : (
            <span className="text-accent text-xs font-medium">
              {(profile?.display_name ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            {profile?.username ? (
              <Link
                href={`/u/${profile.username}`}
                className="text-sm font-medium text-text hover:text-accent transition-colors"
              >
                {profile.display_name}
              </Link>
            ) : (
              <span className="text-sm font-medium text-text">{profile?.display_name}</span>
            )}
            {trail && (
              <>
                <span className="text-text-muted text-xs">hiked</span>
                <Link
                  href={`/trails/${trail.slug}`}
                  className="text-sm font-medium text-accent hover:text-accent-hover truncate transition-colors"
                >
                  {trail.name}
                </Link>
              </>
            )}
          </div>
          <p className="text-xs text-text-muted font-mono">{timeAgo(hike.hiked_at)}</p>
        </div>
      </div>

      {/* Trail hero photo */}
      {trail?.hero_photo_url && (
        <Link href={`/hikes/${hike.id}`}>
          <div className="relative aspect-[16/9] bg-surface-muted">
            <Image
              src={trail.hero_photo_url}
              alt={trail.name}
              fill
              sizes="(max-width: 640px) 100vw, 680px"
              className="object-cover"
            />
          </div>
        </Link>
      )}

      {/* Notes excerpt */}
      {hike.notes && (
        <p className="px-5 pt-3 text-sm text-text-soft leading-relaxed line-clamp-2">
          {hike.notes}
        </p>
      )}

      {/* Footer: reactions + comments + view link */}
      <div className="flex items-center justify-between px-5 py-3 gap-4">
        <Reactions
          hikeId={hike.id}
          reactions={reactionSummaries}
          isSignedIn={!!currentUserId}
        />
        <div className="flex items-center gap-4 shrink-0">
          {hike.comments.length > 0 && (
            <span className="text-xs text-text-muted font-mono">
              {hike.comments.length} comment{hike.comments.length !== 1 ? "s" : ""}
            </span>
          )}
          <Link
            href={`/hikes/${hike.id}`}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            View hike →
          </Link>
        </div>
      </div>
    </article>
  );
}
