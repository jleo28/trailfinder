import Image from "next/image";
import Link from "next/link";
import { Mountain } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { DifficultyChip } from "./DifficultyChip";
import { StatRow } from "./StatRow";
import { TagList } from "./TagList";

export type TrailCardFragment = Pick<
  Database["public"]["Tables"]["trails"]["Row"],
  | "id"
  | "slug"
  | "name"
  | "difficulty"
  | "distance_mi"
  | "elevation_gain_ft"
  | "route_type"
  | "tags"
  | "hero_photo_url"
>;

export function TrailCard({ trail }: { trail: TrailCardFragment }) {
  return (
    <Link href={`/trails/${trail.slug}`} className="group block">
      <article
        className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden
                   transition-[transform,box-shadow] duration-[150ms] hover:-translate-y-0.5 hover:shadow-md"
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        {/* Photo */}
        <div className="relative aspect-[4/3] bg-surface-muted">
          {trail.hero_photo_url ? (
            <Image
              src={trail.hero_photo_url}
              alt={trail.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Mountain className="w-10 h-10 text-text-muted" strokeWidth={1.5} />
            </div>
          )}
          <div className="absolute inset-0 bg-sage-500/0 group-hover:bg-sage-500/[0.04] transition-colors duration-[150ms]" />
          <DifficultyChip difficulty={trail.difficulty} className="absolute top-3 right-3" />
        </div>

        {/* Body */}
        <div className="p-5">
          <h3 className="font-serif text-2xl font-medium leading-[1.15] text-text mb-2 line-clamp-2">
            {trail.name}
          </h3>
          <StatRow
            distanceMi={trail.distance_mi}
            elevationGainFt={trail.elevation_gain_ft}
            difficulty={trail.difficulty}
            routeType={trail.route_type}
          />
          <TagList tags={trail.tags} className="mt-3" max={3} />
        </div>
      </article>
    </Link>
  );
}
