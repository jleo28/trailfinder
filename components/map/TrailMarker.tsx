"use client";

import { useMemo } from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import Link from "next/link";
import type { TrailPin } from "./TrailMap";

const PIN_COLORS: Record<TrailPin["difficulty"], string> = {
  easy: "#B0BC9C",
  moderate: "#6E7E5C",
  hard: "#A14A3A",
};

function createPinIcon(difficulty: TrailPin["difficulty"], selected: boolean) {
  const color = PIN_COLORS[difficulty];
  const size = selected ? 40 : 32;
  const anchor = selected ? 20 : 16;
  const svg = `<svg width="${size}" height="${Math.round(size * 1.25)}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 9.6 12.8 22.4 15.1 24.5a1.3 1.3 0 001.8 0C19.2 38.4 32 25.6 32 16 32 7.163 24.837 0 16 0z"
      fill="${color}" stroke="white" stroke-width="${selected ? 2 : 1.5}"/>
    <circle cx="16" cy="16" r="5.5" fill="white" opacity="0.95"/>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, Math.round(size * 1.25)],
    iconAnchor: [anchor, Math.round(size * 1.25)],
    popupAnchor: [0, -Math.round(size * 1.25) - 4],
  });
}

export function TrailMarker({
  trail,
  isSelected,
  onSelect,
}: {
  trail: TrailPin;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const icon = useMemo(
    () => createPinIcon(trail.difficulty, !!isSelected),
    [trail.difficulty, isSelected]
  );

  return (
    <Marker
      position={[trail.trailhead_lat, trail.trailhead_lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect?.() }}
    >
      <Popup className="glass-popup" minWidth={240} maxWidth={280} closeButton={false}>
        <Link
          href={`/trails/${trail.slug}`}
          className="flex gap-3 p-4 no-underline group/popup"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-[72px] aspect-[3/2] shrink-0 rounded-md overflow-hidden bg-surface-muted relative">
            {trail.hero_photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trail.hero_photo_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex flex-col gap-1.5">
            <span className="font-serif text-sm font-medium leading-[1.2] text-text line-clamp-2">
              {trail.name}
            </span>
            <span className="font-mono text-xs text-text-muted leading-none">
              {trail.distance_mi} mi · +{trail.elevation_gain_ft.toLocaleString()} ft
            </span>
            <span className="text-xs text-accent mt-auto group-hover/popup:text-accent-hover transition-colors">
              View trail →
            </span>
          </div>
        </Link>
      </Popup>
    </Marker>
  );
}
