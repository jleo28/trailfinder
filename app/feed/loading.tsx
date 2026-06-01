import { Skeleton } from "@/components/ui/Skeleton";

function HikeCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="aspect-[3/2] w-full rounded-md" />
      <div className="flex items-center gap-4 pt-1">
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>
    </div>
  );
}

export default function FeedLoading() {
  return (
    <div className="max-w-[680px] mx-auto px-6 py-8 space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <HikeCardSkeleton key={i} />
      ))}
    </div>
  );
}
