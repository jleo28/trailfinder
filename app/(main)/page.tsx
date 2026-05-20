import Link from "next/link";
import { Map, Camera, Users } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HeroSection } from "@/components/home/HeroSection";
import { TrailGrid } from "@/components/trail/TrailGrid";

export const metadata: Metadata = {
  title: "TrailFinder — LA Hiking Trails",
  description:
    "Browse 35+ hand-curated hiking trails across the Los Angeles area. Log hikes, track adventures, and connect with friends.",
};

const FEATURED_SLUGS = [
  "griffith-observatory-fern-dell",
  "malibu-creek-state-park",
  "sandstone-peak",
];

const FEATURES = [
  {
    icon: Map,
    title: "Browse & discover",
    body: "Filter 35+ LA trails by difficulty, distance, and tags. View routes on an interactive map with topo overlay.",
  },
  {
    icon: Camera,
    title: "Log your hikes",
    body: "Record trail conditions, photos, and notes. Build a personal archive of every summit and canyon you've explored.",
  },
  {
    icon: Users,
    title: "Connect with friends",
    body: "See what your friends are hiking. React to their logs, leave comments, and find trails they loved.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("trails")
    .select(
      "id, slug, name, difficulty, distance_mi, elevation_gain_ft, route_type, tags, hero_photo_url, trailhead_lat, trailhead_lng"
    )
    .in("slug", FEATURED_SLUGS);

  // Preserve hand-picked order
  const featured = FEATURED_SLUGS.map((s) => rows?.find((t) => t.slug === s)).filter(
    Boolean
  ) as NonNullable<typeof rows>;

  const heroPhotos = featured.map((t) => t.hero_photo_url).filter(Boolean) as string[];

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <HeroSection photos={heroPhotos} />

      {/* ── Featured trails ───────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-6 py-20">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-serif text-3xl font-medium text-text mb-1">Popular trails</h2>
              <p className="text-text-muted text-sm">Hand-picked favorites across the LA area.</p>
            </div>
            <Link
              href="/trails"
              className="shrink-0 text-sm font-medium text-accent hover:text-accent-hover transition-colors duration-[150ms]"
            >
              View all →
            </Link>
          </div>
          <TrailGrid trails={featured} />
        </section>
      )}

      {/* ── Feature blocks ────────────────────────────────────────────── */}
      <section className="bg-surface-muted border-t border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl font-medium text-text mb-2">
              Everything in one place
            </h2>
            <p className="text-text-muted text-sm max-w-sm mx-auto">
              Built for the LA hiking community — not a fitness tracker.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-accent" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-xl font-medium text-text mb-2">{title}</h3>
                <p className="text-sm text-text-soft leading-[1.7]">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/signup"
              className="inline-block px-8 py-3 rounded-md bg-accent text-accent-on font-medium
                         hover:bg-accent-hover transition-colors duration-[150ms]"
            >
              Create a free account
            </Link>
            <p className="text-xs text-text-muted mt-3">
              No credit card required. &nbsp;
              <Link href="/trails" className="underline hover:text-text transition-colors">
                Browse trails without signing up →
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
