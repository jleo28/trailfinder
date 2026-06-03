"use client";

import { useMap } from "react-leaflet";
import { Plus, Minus, Layers, LocateFixed } from "lucide-react";

interface Props {
  tileLayer: "standard" | "topo";
  onTileLayerChange: (layer: "standard" | "topo") => void;
}

export function MapControls({ tileLayer, onTileLayerChange }: Props) {
  const map = useMap();

  function handleZoomIn(e: React.MouseEvent) {
    e.stopPropagation();
    map.zoomIn();
  }
  function handleZoomOut(e: React.MouseEvent) {
    e.stopPropagation();
    map.zoomOut();
  }
  function handleTileToggle(e: React.MouseEvent) {
    e.stopPropagation();
    onTileLayerChange(tileLayer === "standard" ? "topo" : "standard");
  }
  function handleLocate(e: React.MouseEvent) {
    e.stopPropagation();
    map.locate({ setView: true, maxZoom: 14 });
  }

  // 44px minimum tap target on all screen sizes
  const btnClass =
    "flex items-center justify-center w-11 h-11 hover:bg-surface transition-colors duration-[150ms]";

  return (
    <div
      className="absolute top-4 right-4 z-[1000] flex flex-col gap-2"
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* Zoom */}
      <div className="glass rounded-lg overflow-hidden flex flex-col">
        <button onClick={handleZoomIn} aria-label="Zoom in" className={btnClass}>
          <Plus className="w-4 h-4 text-text-soft" strokeWidth={1.5} />
        </button>
        <div className="h-px bg-border" />
        <button onClick={handleZoomOut} aria-label="Zoom out" className={btnClass}>
          <Minus className="w-4 h-4 text-text-soft" strokeWidth={1.5} />
        </button>
      </div>

      {/* Tile toggle */}
      <button
        onClick={handleTileToggle}
        title={tileLayer === "standard" ? "Switch to Topo" : "Switch to Standard"}
        aria-label={tileLayer === "standard" ? "Switch to topographic map" : "Switch to standard map"}
        className={`glass rounded-lg ${btnClass} ${tileLayer === "topo" ? "ring-1 ring-accent" : ""}`}
      >
        <Layers className="w-4 h-4 text-text-soft" strokeWidth={1.5} />
      </button>

      {/* Locate me */}
      <button
        onClick={handleLocate}
        aria-label="Find my location"
        className={`glass rounded-lg ${btnClass}`}
      >
        <LocateFixed className="w-4 h-4 text-text-soft" strokeWidth={1.5} />
      </button>
    </div>
  );
}
