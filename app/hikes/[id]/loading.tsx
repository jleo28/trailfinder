import { Skeleton } from "@/components/ui/Skeleton";

export default function HikeDetailLoading() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="aspect-[3/2] w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}
