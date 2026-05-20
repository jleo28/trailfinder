import { Map } from "lucide-react";

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`bg-surface-muted flex items-center justify-center ${className ?? ""}`}
      aria-label="Map loading"
    >
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <Map className="w-8 h-8 text-text-muted" strokeWidth={1.5} />
        <span className="text-xs text-text-muted font-mono">Loading map…</span>
      </div>
    </div>
  );
}
