"use client";

import dynamic from "next/dynamic";
import { MapSkeleton } from "./MapSkeleton";

export interface TrailPin {
  id: string;
  slug: string;
  name: string;
  difficulty: "easy" | "moderate" | "hard";
  distance_mi: number;
  elevation_gain_ft: number;
  trailhead_lat: number;
  trailhead_lng: number;
  hero_photo_url: string | null;
}

export interface TrailMapProps {
  trails?: TrailPin[];
  geometry?: { type: "LineString"; coordinates: [number, number][] } | null;
  selectedSlug?: string | null;
  onTrailSelect?: (slug: string) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

const MapImpl = dynamic(
  () => import("./MapImpl").then((m) => ({ default: m.MapImpl })),
  { ssr: false, loading: () => <MapSkeleton /> }
);

export function TrailMap(props: TrailMapProps) {
  return <MapImpl {...props} />;
}
