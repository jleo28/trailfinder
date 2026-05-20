import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { loadGoogleFont } from "@/lib/og/fonts";
import type { Database } from "@/lib/database.types";

export const runtime = "edge";

const W = 1200;
const H = 630;

const SAGE_500 = "#6E7E5C";
const SAGE_300 = "#B0BC9C";

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Anon key — RLS will hide private/friends hikes; returns null for those
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: hike } = await supabase
    .from("hikes")
    .select(
      `hiked_at, visibility,
       trail:trails!hikes_trail_id_fkey(name, hero_photo_url),
       user:profiles!hikes_user_id_fkey(display_name, username)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!hike) {
    return new Response("Not found", { status: 404 });
  }

  const trail = Array.isArray(hike.trail) ? hike.trail[0] : hike.trail;
  const user = Array.isArray(hike.user) ? hike.user[0] : hike.user;
  const trailName = trail?.name ?? "Trail Log";
  const heroPhoto = trail?.hero_photo_url ?? null;
  const displayName = user?.display_name ?? null;
  const hikedDate = formatDate(hike.hiked_at);

  const headlineText = trailName + " TrailFinder" + (displayName ?? "");
  const fraunces = await loadGoogleFont("Fraunces", 600, headlineText);

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
        {heroPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroPhoto}
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
            height: 360,
            background: `linear-gradient(to top, rgba(66,79,56,0.92) 0%, rgba(66,79,56,0.55) 45%, transparent 100%)`,
          }}
        />

        {/* ── "HIKE LOG" badge — top-left ───────────────────────────── */}
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
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 13,
              color: SAGE_300,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginLeft: 8,
              paddingTop: 2,
            }}
          >
            Hike Log
          </span>
        </div>

        {/* ── Trail name + byline — bottom-left ─────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 52,
            left: 48,
            right: 48,
            display: "flex",
            flexDirection: "column",
            gap: 14,
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
              maxWidth: 820,
            }}
          >
            {trailName}
          </span>
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 20,
              color: SAGE_300,
              letterSpacing: "0.01em",
            }}
          >
            {displayName ? `Hiked by ${displayName}  ·  ${hikedDate}` : hikedDate}
          </span>
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
