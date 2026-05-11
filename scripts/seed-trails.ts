/**
 * Seed script — populates the trails table with 30+ LA-area trails.
 *
 * Usage:
 *   npm run seed
 *
 * Requirements:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   UNSPLASH_ACCESS_KEY in .env.local (optional — omit to skip hero photos)
 *
 * Re-running is safe: all inserts use UPSERT on slug.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

// ── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

if (!UNSPLASH_KEY) {
  console.warn(
    "⚠  UNSPLASH_ACCESS_KEY not set — trails will be seeded without hero photos."
  );
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Types ────────────────────────────────────────────────────────────────────

type Difficulty = "easy" | "moderate" | "hard";
type RouteType = "loop" | "out_and_back" | "point_to_point";

interface TrailRow {
  slug: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  distance_mi: number;
  elevation_gain_ft: number;
  route_type: RouteType;
  trailhead_lat: number;
  trailhead_lng: number;
  tags: string[];
  unsplash_query: string;
}

type GeoJSON = { type: "LineString"; coordinates: [number, number][] };

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchOverpassGeometry(
  name: string,
  lat: number,
  lng: number
): Promise<GeoJSON | null> {
  const escapedName = name.replace(/['"]/g, "");
  const query = `
[out:json][timeout:15];
(
  way(around:8000,${lat},${lng})[name~"${escapedName}",i][highway~"path|track|footway"];
  way(around:8000,${lat},${lng})[name~"${escapedName.split(" ")[0]}",i][highway~"path|track|footway"];
);
out geom 1;
  `.trim();

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "TrailFinder/1.0 (https://github.com/jleo28/trailfinder)",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as {
      elements: { geometry?: { lat: number; lon: number }[] }[];
    };

    const way = json.elements[0];
    if (!way?.geometry?.length) return null;

    const coords: [number, number][] = way.geometry.map(
      (pt) => [pt.lon, pt.lat] as [number, number]
    );
    return { type: "LineString", coordinates: coords };
  } catch {
    return null;
  }
}

async function fetchUnsplashPhoto(query: string): Promise<string | null> {
  if (!UNSPLASH_KEY) return null;
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("client_id", UNSPLASH_KEY);
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("per_page", "1");
    url.searchParams.set("content_filter", "high");

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      results?: { urls?: { regular?: string } }[];
    };
    return json.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.join(process.cwd(), "data", "trail-overrides.csv");
  const rawCsv = fs.readFileSync(csvPath, "utf-8");

  const rows = parse(rawCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  console.log(`\nSeeding ${rows.length} trails…\n`);

  let inserted = 0;
  let skipped = 0;

  for (const [i, row] of rows.entries()) {
    const trail: TrailRow = {
      slug: row["slug"]!,
      name: row["name"]!,
      description: row["description"]!,
      difficulty: row["difficulty"] as Difficulty,
      distance_mi: parseFloat(row["distance_mi"]!),
      elevation_gain_ft: parseInt(row["elevation_gain_ft"]!, 10),
      route_type: row["route_type"] as RouteType,
      trailhead_lat: parseFloat(row["trailhead_lat"]!),
      trailhead_lng: parseFloat(row["trailhead_lng"]!),
      tags: (row["tags"] ?? "").split(",").map((t) => t.trim()).filter(Boolean),
      unsplash_query: row["unsplash_query"]!,
    };

    process.stdout.write(`[${i + 1}/${rows.length}] ${trail.name} … `);

    // 1. Geometry from OSM Overpass
    const geometry = await fetchOverpassGeometry(
      trail.name,
      trail.trailhead_lat,
      trail.trailhead_lng
    );
    await sleep(1100); // be polite to Overpass

    // 2. Hero photo from Unsplash
    const hero_photo_url = await fetchUnsplashPhoto(trail.unsplash_query);
    if (UNSPLASH_KEY) await sleep(300);

    // 3. Upsert to Supabase
    const { error } = await supabase.from("trails").upsert(
      {
        slug: trail.slug,
        name: trail.name,
        description: trail.description,
        difficulty: trail.difficulty,
        distance_mi: trail.distance_mi,
        elevation_gain_ft: trail.elevation_gain_ft,
        route_type: trail.route_type,
        trailhead_lat: trail.trailhead_lat,
        trailhead_lng: trail.trailhead_lng,
        tags: trail.tags,
        geometry: geometry ?? null,
        hero_photo_url: hero_photo_url ?? null,
        is_verified: true,
      },
      { onConflict: "slug" }
    );

    if (error) {
      console.log(`✗ ${error.message}`);
      skipped++;
    } else {
      const flags = [
        geometry ? "geom ✓" : "geom ✗",
        hero_photo_url ? "photo ✓" : "photo ✗",
      ].join(", ");
      console.log(`✓  (${flags})`);
      inserted++;
    }
  }

  console.log(`\nDone. ${inserted} upserted, ${skipped} errors.\n`);

  if (!UNSPLASH_KEY) {
    console.log(
      "To add hero photos, set UNSPLASH_ACCESS_KEY in .env.local and re-run npm run seed.\n"
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
