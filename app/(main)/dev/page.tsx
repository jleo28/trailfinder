import { createClient } from "@/lib/supabase/server";
import { TrailGrid } from "@/components/trail/TrailGrid";
import { DifficultyChip } from "@/components/trail/DifficultyChip";
import { StatRow } from "@/components/trail/StatRow";
import { TagList } from "@/components/trail/TagList";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function DevPage() {
  const supabase = await createClient();
  const { data: trails } = await supabase
    .from("trails")
    .select(
      "id, slug, name, difficulty, distance_mi, elevation_gain_ft, route_type, tags, hero_photo_url"
    )
    .limit(9);

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-16 space-y-16">
      <div>
        <h1 className="font-serif text-3xl font-medium text-text mb-1">Trail components</h1>
        <p className="font-mono text-sm text-text-muted">T-11 acceptance check · toggle theme to verify both modes</p>
      </div>

      {/* Primitives */}
      <section className="space-y-8">
        <h2 className="text-xs font-medium tracking-[0.06em] uppercase text-text-muted">
          Primitives
        </h2>

        <div className="space-y-1">
          <p className="text-xs text-text-muted mb-3">DifficultyChip</p>
          <div className="flex items-center gap-3">
            <DifficultyChip difficulty="easy" />
            <DifficultyChip difficulty="moderate" />
            <DifficultyChip difficulty="hard" />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-text-muted mb-3">StatRow</p>
          <StatRow distanceMi={4.2} elevationGainFt={850} difficulty="moderate" routeType="loop" />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-text-muted mb-3">TagList</p>
          <TagList tags={["loop", "dog-friendly", "views", "waterfall", "creek", "summit"]} />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-text-muted mb-3">Skeleton</p>
          <div className="space-y-2 max-w-sm">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="space-y-6">
        <h2 className="text-xs font-medium tracking-[0.06em] uppercase text-text-muted">
          Trail grid — {trails?.length ?? 0} seeded trails
        </h2>
        {trails?.length ? (
          <TrailGrid trails={trails} />
        ) : (
          <p className="text-sm text-text-muted">
            No trails found. Run{" "}
            <code className="font-mono bg-surface-muted px-1.5 py-0.5 rounded-sm">
              npm run seed
            </code>{" "}
            first.
          </p>
        )}
      </section>
    </main>
  );
}
