import { cn } from "@/lib/utils";

function formatTag(tag: string) {
  return tag
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function TagList({
  tags,
  className,
  max = 4,
}: {
  tags: string[] | null;
  className?: string;
  max?: number;
}) {
  if (!tags?.length) return null;
  const visible = tags.slice(0, max);
  const overflow = tags.length - visible.length;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visible.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent-soft text-accent"
        >
          {formatTag(tag)}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-text-muted">
          +{overflow}
        </span>
      )}
    </div>
  );
}
