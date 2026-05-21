import Link from "next/link";

export function NotFoundState({
  heading = "Not found.",
  body = "The page you're looking for doesn't exist or has been removed.",
  href = "/",
  linkLabel = "Go home",
}: {
  heading?: string;
  body?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <p className="font-mono text-xs tracking-widest text-text-muted uppercase mb-4">
        404
      </p>
      <h1 className="font-serif text-3xl font-medium text-text mb-3">{heading}</h1>
      <p className="text-sm text-text-muted max-w-sm mb-8">{body}</p>
      <Link
        href={href}
        className="px-4 py-2 rounded-md bg-accent text-accent-on text-sm font-medium
                   hover:bg-accent-hover transition-colors duration-[150ms]"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
