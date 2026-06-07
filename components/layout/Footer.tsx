import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-bg">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-serif text-lg text-text mb-1">TrailFinder</p>
          <p className="text-sm text-text-muted">
            A social hiking app for the LA trail community.
          </p>
        </div>

        <div className="flex items-center gap-5 text-sm text-text-muted">
          <Link
            href="/about"
            className="hover:text-text transition-colors duration-[150ms]"
          >
            About
          </Link>
          <a
            href="https://github.com/jleo28/trailfinder"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text transition-colors duration-[150ms]"
          >
            GitHub
          </a>
          <a
            href="https://jleo.me"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text transition-colors duration-[150ms]"
          >
            jleo.me
          </a>
        </div>
      </div>
    </footer>
  );
}
