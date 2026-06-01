import { Skeleton } from "@/components/ui/Skeleton";

export default function TrailDetailLoading() {
  return (
    <div>
      {/* Hero */}
      <Skeleton className="aspect-[21/9] w-full rounded-none" />
      <div className="max-w-[900px] mx-auto px-6 py-10 space-y-8">
        {/* Stats */}
        <Skeleton className="h-4 w-64" />
        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        {/* Map */}
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
