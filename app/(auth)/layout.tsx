import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-16">
      <Link
        href="/"
        className="font-serif text-2xl text-text tracking-tight hover:text-accent transition-colors duration-[150ms] mb-8"
      >
        TrailFinder
      </Link>
      {children}
    </div>
  );
}
