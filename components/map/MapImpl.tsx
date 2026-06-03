"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
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

function FitBounds({ geometry }: { geometry: LineString }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.geoJSON(geometry as GeoJSON.GeoJsonObject).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: false });
    }
  }, [map, geometry]);
  return null;
}

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

function UserLocationMarker() {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    function onFound(e: L.LocationEvent) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    }
    map.on("locationfound", onFound);
    return () => {
      map.off("locationfound", onFound);
    };
  }, [map]);

  if (!position) return null;

  const icon = L.divIcon({
    html: `<div class="user-location-dot"><div class="user-location-inner"></div><div class="user-location-ring"></div></div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return <Marker position={position} icon={icon} />;
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

      {geometry?.coordinates?.length && <FitBounds geometry={geometry} />}
      {geometry?.coordinates?.length && <TrailRoute geometry={geometry} />}

      <UserLocationMarker />
      <MapControls tileLayer={tileLayer} onTileLayerChange={setTileLayer} />
    </MapContainer>
  );
}
