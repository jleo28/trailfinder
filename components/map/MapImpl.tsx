"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { TrailMarker } from "./TrailMarker";
import { MapControls } from "./MapControls";
import type { TrailMapProps } from "./TrailMap";

const LA_CENTER: [number, number] = [34.05, -118.25];
const DEFAULT_ZOOM = 11;

const TILE_URLS = {
  standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
};

const TILE_ATTRIBUTION = {
  standard:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  topo: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
};

type LineString = { type: "LineString"; coordinates: [number, number][] };

function TrailRoute({ geometry }: { geometry: LineString }) {
  const map = useMap();

  useEffect(() => {
    const layer = L.geoJSON(geometry as GeoJSON.GeoJsonObject, {
      style: {
        color: "#6E7E5C",
        weight: 3,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      },
    }).addTo(map);

    // Animate stroke-dashoffset on mount
    requestAnimationFrame(() => {
      layer.getLayers().forEach((l) => {
        const el = (l as L.Path).getElement() as SVGPathElement | null;
        if (!el) return;
        const length = el.getTotalLength();
        el.style.strokeDasharray = `${length}`;
        el.style.strokeDashoffset = `${length}`;
        requestAnimationFrame(() => {
          el.style.transition = "stroke-dashoffset 800ms cubic-bezier(0.2, 0.8, 0.2, 1)";
          el.style.strokeDashoffset = "0";
        });
      });
    });

    return () => {
      map.removeLayer(layer);
    };
  }, [map, geometry]);

  return null;
}

export function MapImpl({
  trails,
  geometry,
  selectedSlug,
  onTrailSelect,
  center,
  zoom,
  className,
}: TrailMapProps) {
  const [tileLayer, setTileLayer] = useState<"standard" | "topo">("standard");

  return (
    <MapContainer
      center={center ?? LA_CENTER}
      zoom={zoom ?? DEFAULT_ZOOM}
      className={className ?? "h-full w-full"}
      zoomControl={false}
      scrollWheelZoom
    >
      <TileLayer url={TILE_URLS[tileLayer]} attribution={TILE_ATTRIBUTION[tileLayer]} />

      {trails?.map((trail) => (
        <TrailMarker
          key={trail.id}
          trail={trail}
          isSelected={trail.slug === selectedSlug}
          onSelect={() => onTrailSelect?.(trail.slug)}
        />
      ))}

      {geometry?.coordinates?.length && <TrailRoute geometry={geometry} />}

      <MapControls tileLayer={tileLayer} onTileLayerChange={setTileLayer} />
    </MapContainer>
  );
}
