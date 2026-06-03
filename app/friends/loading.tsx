import { Skeleton } from "@/components/ui/Skeleton";

function FriendRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  );
}

export default function FriendsLoading() {
  return (
    <div className="max-w-[680px] mx-auto px-6 py-8">
      <Skeleton className="h-8 w-32 mb-8" />
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <FriendRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
