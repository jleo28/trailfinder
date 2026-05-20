import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TrailMap } from "@/components/map/TrailMap";
import { DifficultyChip } from "@/components/trail/DifficultyChip";
import { TagList } from "@/components/trail/TagList";
import type { Json } from "@/lib/database.types";

interface Props {
  params: Promise<{ slug: string }>;
}

type LineString = { type: "LineString"; coordinates: [number, number][] };

function isLineString(g: Json): g is LineString {
  return (
    typeof g === "object" &&
    g !== null &&
    !Array.isArray(g) &&
    (g as Record<string, unknown>)["type"] === "LineString"
  );
}

function routeTypeLabel(rt: string) {
  if (rt === "loop") return "Loop";
  if (rt === "out_and_back") return "Out & Back";
  return "Point to Point";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("trails")
    .select("name, description, hero_photo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return {};

  return {
    title: data.name,
    description: data.description ?? undefined,
    openGraph: {
      title: `${data.name} · TrailFinder`,
      description: data.description ?? undefined,
      images: data.hero_photo_url ? [{ url: data.hero_photo_url, width: 1200 }] : [],
    },
  };
}

export default async function TrailDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: trail } = await supabase
    .from("trails")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!trail) notFound();

  const { data: photos } = await supabase
    .from("trail_photos")
    .select("id, storage_path, is_hero")
    .eq("trail_id", trail.id)
    .order("is_hero", { ascending: false })
    .limit(4);

  const geometry = isLineString(trail.geometry) ? trail.geometry : null;

  // ── Friends who hiked this (T-26) ─────────────────────────────────────────
  type FriendHiker = {
    hikeId: string;
    hikedAt: string;
    userId: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
  let friendHikers: FriendHiker[] = [];

  if (viewer) {
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${viewer.id},addressee_id.eq.${viewer.id}`)
      .eq("status", "accepted");

    const friendIds = (friendships ?? []).map((f) =>
      f.requester_id === viewer.id ? f.addressee_id : f.requester_id
    );

    if (friendIds.length > 0) {
      const { data: fhikes } = await supabase
        .from("hikes")
        .select(
          "id, hiked_at, user_id, profile:profiles!hikes_user_id_fkey(id, username, display_name, avatar_url)"
        )
        .eq("trail_id", trail.id)
        .in("user_id", friendIds)
        .order("hiked_at", { ascending: false })
        .limit(10);

      type FHProfile = { id: string; username: string; display_name: string; avatar_url: string | null };
      friendHikers = (fhikes ?? []).map((h) => {
        const p = Array.isArray(h.profile) ? h.profile[0] : h.profile as FHProfile | null;
        return {
          hikeId: h.id,
          hikedAt: h.hiked_at,
          userId: h.user_id,
          displayName: p?.display_name ?? "Friend",
          username: p?.username ?? "",
          avatarUrl: p?.avatar_url ?? null,
        };
      });
    }
  }

  const allPhotos = [
    ...(trail.hero_photo_url ? [{ src: trail.hero_photo_url, alt: trail.name }] : []),
    ...(photos ?? []).map((p) => ({
      src: p.storage_path,
      alt: trail.name,
    })),
  ];

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative aspect-[16/9] md:aspect-[21/9] md:max-h-[520px] overflow-hidden bg-surface-muted">
        {trail.hero_photo_url && (
          <Image
            src={trail.hero_photo_url}
            alt={trail.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(22,20,15,0.68) 0%, transparent 55%)",
          }}
        />
        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 md:px-12 md:pb-10">
          <DifficultyChip difficulty={trail.difficulty} className="mb-3" />
          <h1
            className="font-serif text-4xl md:text-5xl font-semibold text-white leading-[1.05] mb-3 max-w-3xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            {trail.name}
          </h1>
          <p className="font-mono text-sm text-white/75">
            {trail.distance_mi} mi &nbsp;·&nbsp; +{trail.elevation_gain_ft.toLocaleString()} ft
            &nbsp;·&nbsp; {routeTypeLabel(trail.route_type)}
          </p>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="max-w-[1200px] w-full mx-auto px-6 py-12 space-y-14">

        {/* Tags + CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TagList tags={trail.tags} max={10} />
          <Link
            href={`/hikes/log?trail=${trail.slug}`}
            className="shrink-0 px-5 py-2.5 rounded-md bg-accent text-accent-on text-sm font-medium
                       hover:bg-accent-hover transition-colors duration-[150ms]"
          >
            Log a hike →
          </Link>
        </div>

        {/* Description */}
        {trail.description && (
          <section>
            <h2 className="font-serif text-2xl font-medium text-text mb-4">About this trail</h2>
            <p className="text-base text-text-soft leading-[1.65] max-w-[65ch]">
              {trail.description}
            </p>
          </section>
        )}

        {/* Route map */}
        <section>
          <h2 className="font-serif text-2xl font-medium text-text mb-4">Route</h2>
          <div className="rounded-xl overflow-hidden border border-border" style={{ height: 420 }}>
            <TrailMap
              trails={[
                {
                  id: trail.id,
                  slug: trail.slug,
                  name: trail.name,
                  difficulty: trail.difficulty,
                  distance_mi: trail.distance_mi,
                  elevation_gain_ft: trail.elevation_gain_ft,
                  trailhead_lat: trail.trailhead_lat,
                  trailhead_lng: trail.trailhead_lng,
                  hero_photo_url: trail.hero_photo_url,
                },
              ]}
              geometry={geometry}
              center={[trail.trailhead_lat, trail.trailhead_lng]}
              zoom={geometry ? 13 : 14}
              className="h-full w-full"
            />
          </div>
          {!geometry && (
            <p className="mt-2 text-xs text-text-muted font-mono">
              Route geometry not available for this trail.
            </p>
          )}
        </section>

        {/* Photo bento — only when photos exist beyond the hero */}
        {allPhotos.length >= 4 && (
          <section>
            <h2 className="font-serif text-2xl font-medium text-text mb-4">Photos</h2>
            {/* Desktop bento: hero left (2:3), 3 crops right */}
            <div className="hidden md:grid grid-cols-[2fr_1fr] gap-2 rounded-xl overflow-hidden" style={{ height: 480 }}>
              <div className="relative">
                {allPhotos[0] && (
                  <Image src={allPhotos[0].src} alt={allPhotos[0].alt} fill className="object-cover" />
                )}
              </div>
              <div className="grid grid-rows-3 gap-2">
                {allPhotos.slice(1, 4).map((p, i) => (
                  <div key={i} className="relative">
                    <Image src={p.src} alt={p.alt} fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile: horizontal snap scroll */}
            <div className="flex md:hidden gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-6 px-6">
              {allPhotos.map((p, i) => (
                <div key={i} className="relative aspect-[3/2] w-[80vw] shrink-0 snap-start rounded-lg overflow-hidden bg-surface-muted">
                  <Image src={p.src} alt={p.alt} fill className="object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews placeholder */}
        <section>
          <h2 className="font-serif text-2xl font-medium text-text mb-4">Reviews</h2>
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-sm text-text-muted">Reviews coming in T-22.</p>
          </div>
        </section>

        {/* Friends who hiked this */}
        {friendHikers.length > 0 && (
          <section>
            <h2 className="font-serif text-2xl font-medium text-text mb-4">Friends who hiked this</h2>
            <details className="group">
              <summary className="flex items-center gap-3 cursor-pointer list-none">
                {/* Avatar stack */}
                <div className="flex -space-x-2">
                  {friendHikers.slice(0, 5).map((h) => (
                    <div
                      key={h.userId}
                      className="w-8 h-8 rounded-full overflow-hidden bg-accent-soft ring-2 ring-surface flex items-center justify-center"
                    >
                      {h.avatarUrl ? (
                        <Image
                          src={h.avatarUrl}
                          alt={h.displayName}
                          width={32}
                          height={32}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-accent text-xs font-medium">
                          {h.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-text-soft">
                  <span className="font-medium text-text">
                    {friendHikers
                      .slice(0, 2)
                      .map((h) => h.displayName)
                      .join(", ")}
                    {friendHikers.length > 2 && ` +${friendHikers.length - 2}`}
                  </span>{" "}
                  hiked this
                  <span className="ml-2 text-text-muted text-xs group-open:hidden">▼</span>
                  <span className="ml-2 text-text-muted text-xs hidden group-open:inline">▲</span>
                </p>
              </summary>
              <div className="mt-4 space-y-2 pl-2">
                {friendHikers.map((h) => (
                  <Link
                    key={h.hikeId}
                    href={`/hikes/${h.hikeId}`}
                    className="flex items-center gap-2 text-sm text-text-soft hover:text-accent transition-colors"
                  >
                    <span className="font-medium text-text">{h.displayName}</span>
                    <span className="text-text-muted font-mono text-xs">
                      {new Date(h.hikedAt + "T12:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-accent text-xs">→</span>
                  </Link>
                ))}
              </div>
            </details>
          </section>
        )}

      </div>
    </div>
  );
}
