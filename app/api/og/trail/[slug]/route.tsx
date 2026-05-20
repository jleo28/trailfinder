import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { loadGoogleFont } from "@/lib/og/fonts";
import type { Database } from "@/lib/database.types";

export const runtime = "edge";

const W = 1200;
const H = 630;

const SAGE_700 = "#424F38";
const SAGE_500 = "#6E7E5C";
const SAGE_300 = "#B0BC9C";

function difficultyLabel(d: string) {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function routeLabel(rt: string) {
  if (rt === "loop") return "Loop";
  if (rt === "out_and_back") return "Out & Back";
  return "Point to Point";
}

function statRow(distanceMi: number, elevationFt: number, difficulty: string, routeType: string) {
  const parts = [
    `${distanceMi.toFixed(1)} mi`,
    `+${elevationFt.toLocaleString()} ft`,
    difficultyLabel(difficulty),
    routeLabel(routeType),
  ];
  return parts.join("  ·  ");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: trail } = await supabase
    .from("trails")
    .select("name, difficulty, distance_mi, elevation_gain_ft, route_type, hero_photo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!trail) {
    return new Response("Not found", { status: 404 });
  }

  const stats = statRow(
    trail.distance_mi,
    trail.elevation_gain_ft,
    trail.difficulty,
    trail.route_type
  );

  // Load Fraunces subset for the trail name only (fast, minimal glyphs)
  const fraunces = await loadGoogleFont("Fraunces", 600, trail.name + " TrailFinder");

  const fonts: { name: string; data: ArrayBuffer; weight: 600; style: "normal" }[] = fraunces
    ? [{ name: "Fraunces", data: fraunces, weight: 600, style: "normal" }]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: "#16140F",
          fontFamily: fraunces ? "Fraunces, serif" : "serif",
          overflow: "hidden",
        }}
      >
        {/* ── Hero photo ────────────────────────────────────────────── */}
        {trail.hero_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trail.hero_photo_url}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* ── Sage top stripe ───────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: SAGE_500,
          }}
        />

        {/* ── Bottom sage-tinted vignette ───────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 320,
            background: `linear-gradient(to top, rgba(66,79,56,0.92) 0%, rgba(66,79,56,0.55) 45%, transparent 100%)`,
          }}
        />

        {/* ── TrailFinder wordmark — top-left ───────────────────────── */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 48,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: SAGE_500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "white",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: fraunces ? "Fraunces, serif" : "serif",
              fontSize: 22,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-0.01em",
            }}
          >
            TrailFinder
          </span>
        </div>

        {/* ── Trail name + stats — bottom-left ──────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 52,
            left: 48,
            right: 48,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: fraunces ? "Fraunces, serif" : "serif",
              fontSize: 60,
              fontWeight: 600,
              color: "#FFFFFF",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              maxWidth: 800,
            }}
          >
            {trail.name}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
            }}
          >
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 20,
                color: SAGE_300,
                letterSpacing: "0.01em",
              }}
            >
              {stats}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    }
  );
}
