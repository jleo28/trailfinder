import { Skeleton } from "@/components/ui/Skeleton";

function TrailCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="p-5 space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function TrailsLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <TrailCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
