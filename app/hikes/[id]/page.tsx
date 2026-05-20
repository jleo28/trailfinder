import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin as admin } from "@/lib/supabase/admin";
import { DifficultyChip } from "@/components/trail/DifficultyChip";
import { DeleteHikeButton } from "./DeleteHikeButton";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const CONDITIONS_STYLE: Record<string, string> = {
  excellent: "bg-sage-100 text-sage-700",
  good: "bg-sage-100 text-sage-600",
  fair: "bg-mushroom-100 text-mushroom-700",
  poor: "bg-[#A14A3A]/10 text-[#A14A3A]",
};

const VISIBILITY_LABEL: Record<string, string> = {
  public: "Public",
  friends: "Friends only",
  private: "Private",
};

function Avatar({
  url,
  name,
  size = 36,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      <div
        className="rounded-full overflow-hidden shrink-0 bg-surface-muted"
        style={{ width: size, height: size }}
      >
        <Image src={url} alt={name} width={size} height={size} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-accent flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-accent-on font-medium" style={{ fontSize: size * 0.38 }}>
        {initials}
      </span>
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("hikes")
    .select("hiked_at, trail:trails!hikes_trail_id_fkey(name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return {};
  const trailName = Array.isArray(data.trail) ? data.trail[0]?.name : (data.trail as { name: string } | null)?.name;
  return { title: trailName ? `${trailName} · ${formatDate(data.hiked_at)}` : "Hike log" };
}

export default async function HikeDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS handles visibility — returns null if unauthorized
  const { data: hike } = await supabase
    .from("hikes")
    .select(
      `*, trail:trails!hikes_trail_id_fkey(id, slug, name, difficulty, distance_mi, elevation_gain_ft),
           profile:profiles!hikes_user_id_fkey(id, username, display_name, avatar_url)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!hike) notFound();

  const trail = Array.isArray(hike.trail) ? hike.trail[0] : hike.trail as {
    id: string; slug: string; name: string;
    difficulty: "easy" | "moderate" | "hard";
    distance_mi: number; elevation_gain_ft: number;
  } | null;

  const profile = Array.isArray(hike.profile) ? hike.profile[0] : hike.profile as {
    id: string; username: string; display_name: string; avatar_url: string | null;
  } | null;

  const isOwner = user?.id === hike.user_id;

  // Fetch photos — use admin to generate signed URLs regardless of who's viewing
  const { data: photos } = await admin
    .from("hike_photos")
    .select("id, storage_path, position, width, height")
    .eq("hike_id", id)
    .order("position");

  const signedPhotos: { id: string; url: string; width: number | null; height: number | null }[] = [];
  if (photos?.length) {
    const { data: signed } = await admin.storage
      .from("hike-photos")
      .createSignedUrls(
        photos.map((p) => p.storage_path),
        3600
      );
    for (const [i, p] of photos.entries()) {
      const url = signed?.[i]?.signedUrl;
      if (url) signedPhotos.push({ id: p.id, url, width: p.width, height: p.height });
    }
  }

  const duration = formatDuration(hike.duration_minutes);

  return (
    <div className="max-w-[900px] mx-auto px-6 py-12 space-y-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {trail && (
          <Link
            href={`/trails/${trail.slug}`}
            className="inline-flex items-center gap-1.5 text-accent hover:text-accent-hover transition-colors duration-[150ms]"
          >
            <DifficultyChip difficulty={trail.difficulty} />
            <span className="font-serif text-2xl font-medium text-text hover:text-accent transition-colors ml-1">
              {trail.name}
            </span>
            <span className="text-accent text-sm">↗</span>
          </Link>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {/* User + date */}
            {profile && (
              <div className="flex items-center gap-2.5">
                <Avatar url={profile.avatar_url} name={profile.display_name} size={32} />
                <div className="text-sm">
                  <Link
                    href={`/u/${profile.username}`}
                    className="font-medium text-text hover:text-accent transition-colors"
                  >
                    {profile.display_name}
                  </Link>
                  <span className="text-text-muted"> · {formatDate(hike.hiked_at)}</span>
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-2">
              {duration && (
                <span className="font-mono text-sm text-text-muted">{duration}</span>
              )}
              {hike.conditions && CONDITIONS_STYLE[hike.conditions] && (
                <span
                  className={`px-2 py-0.5 rounded-sm text-xs font-medium ${CONDITIONS_STYLE[hike.conditions]}`}
                >
                  {hike.conditions.charAt(0).toUpperCase() + hike.conditions.slice(1)} conditions
                </span>
              )}
              <span className="text-xs text-text-muted border border-border rounded-sm px-2 py-0.5">
                {VISIBILITY_LABEL[hike.visibility] ?? hike.visibility}
              </span>
            </div>
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div className="flex items-center gap-2">
              <Link
                href={`/hikes/${id}/edit`}
                className="px-3 py-1.5 rounded-md border border-border text-text-soft text-xs font-medium
                           hover:bg-surface-muted transition-colors duration-[150ms]"
              >
                Edit
              </Link>
              <DeleteHikeButton hikeId={id} />
            </div>
          )}
        </div>
      </div>

      {/* ── Photos ─────────────────────────────────────────────────────── */}
      {signedPhotos.length > 0 && (
        <section>
          {signedPhotos.length >= 4 ? (
            /* Bento: hero left, 3 crops right */
            <div
              className="hidden md:grid grid-cols-[2fr_1fr] gap-2 rounded-xl overflow-hidden"
              style={{ height: 480 }}
            >
              <div className="relative">
                <Image
                  src={signedPhotos[0]!.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 900px) 100vw, 600px"
                  priority
                />
              </div>
              <div className="grid grid-rows-3 gap-2">
                {signedPhotos.slice(1, 4).map((p) => (
                  <div key={p.id} className="relative">
                    <Image src={p.url} alt="" fill className="object-cover" sizes="300px" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Simple grid for 1-3 photos */
            <div className="hidden md:grid gap-2 rounded-xl overflow-hidden"
              style={{ gridTemplateColumns: `repeat(${Math.min(signedPhotos.length, 3)}, 1fr)`, height: 360 }}>
              {signedPhotos.slice(0, 3).map((p) => (
                <div key={p.id} className="relative">
                  <Image src={p.url} alt="" fill className="object-cover" sizes="300px" priority />
                </div>
              ))}
            </div>
          )}
          {/* Mobile: snap scroll */}
          <div className="flex md:hidden gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-6 px-6">
            {signedPhotos.map((p) => (
              <div
                key={p.id}
                className="relative aspect-[3/2] w-[80vw] shrink-0 snap-start rounded-lg overflow-hidden bg-surface-muted"
              >
                <Image src={p.url} alt="" fill className="object-cover" sizes="80vw" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      {hike.notes && (
        <section>
          <h2 className="font-serif text-xl font-medium text-text mb-3">Notes</h2>
          <p className="text-base text-text-soft leading-[1.65] max-w-[65ch] whitespace-pre-wrap">
            {hike.notes}
          </p>
        </section>
      )}

      {/* ── Reactions placeholder ───────────────────────────────────────── */}
      <section>
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-text-muted">Reactions coming in T-21.</p>
        </div>
      </section>

      {/* ── Comments placeholder ────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl font-medium text-text mb-4">Comments</h2>
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-text-muted">Comments coming in T-22.</p>
        </div>
      </section>

    </div>
  );
}
