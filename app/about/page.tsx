import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "About · TrailFinder",
  description:
    "TrailFinder is a social hiking app for the LA trail community, rebuilt from a CSCI-201 final project.",
};

const TEAMMATES = [
  "Evan Adami",
  "Ibsa Abadiga",
  "Logan Lusher",
  "Lucas Jerry",
  "Malachi Dewitt",
  "Nicolo Naoni",
  "Yaphet Bekele",
];

const STACK = [
  { label: "Framework",  value: "Next.js 14 (App Router)" },
  { label: "Language",   value: "TypeScript" },
  { label: "Database",   value: "Supabase (Postgres)" },
  { label: "Auth",       value: "Supabase Auth" },
  { label: "Maps",       value: "Leaflet + react-leaflet" },
  { label: "Styling",    value: "Tailwind CSS v4" },
  { label: "Hosting",    value: "Vercel" },
];

export default function AboutPage() {
  return (
    <div className="max-w-[680px] mx-auto px-6 py-16 space-y-16">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h1 className="font-serif text-4xl font-semibold text-text leading-tight">
          About TrailFinder
        </h1>
        <p className="text-base text-text-soft leading-relaxed">
          TrailFinder is a social hiking app for the Los Angeles trail community —
          browse trails with an interactive map, log hikes with photos, and share
          adventures with friends.
        </p>
      </section>

      {/* ── Origin ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-medium text-text">Origin</h2>
        <p className="text-base text-text-soft leading-relaxed">
          This is a ground-up rebuild of a final project originally built for{" "}
          <span className="text-text font-medium">CSCI-201 (Systems Programming)</span>{" "}
          at USC. The original version ran on Java Servlets with a hand-rolled JWT
          authentication system. This rebuild replaces the entire stack with modern
          tooling while keeping the same core idea: a place for hikers to plan,
          log, and share trail experiences.
        </p>
        <p className="text-base text-text-soft leading-relaxed">
          The original concept and feature set were designed collaboratively by a
          team of eight. The rebuild is solo work by Joseph Leo, but the credit for
          the idea belongs to the whole group.
        </p>
      </section>

      {/* ── Original team ─────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="font-serif text-2xl font-medium text-text">
          Original CSCI-201 team
        </h2>
        <ul className="space-y-2">
          {TEAMMATES.map((name) => (
            <li key={name} className="flex items-center gap-3">
              <span
                className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"
                aria-hidden="true"
              />
              <span className="text-base text-text-soft">{name}</span>
            </li>
          ))}
          <li className="flex items-center gap-3">
            <span
              className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"
              aria-hidden="true"
            />
            <span className="text-base text-text-soft">
              Joseph Leo{" "}
              <span className="text-text-muted text-sm">(rebuild)</span>
            </span>
          </li>
        </ul>
      </section>

      {/* ── Tech stack ────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="font-serif text-2xl font-medium text-text">Tech stack</h2>
        <dl className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {STACK.map(({ label, value }) => (
            <div key={label} className="flex items-center px-5 py-3 bg-surface">
              <dt className="w-32 shrink-0 text-sm text-text-muted">{label}</dt>
              <dd className="text-sm text-text font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Links ─────────────────────────────────────────────────── */}
      <section className="flex flex-wrap gap-3">
        <a
          href="https://github.com/jleo28/trailfinder"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-surface border border-border
                     text-sm text-text-soft hover:text-text hover:bg-surface-muted
                     transition-colors duration-[150ms]"
        >
          <ExternalLink size={15} strokeWidth={1.5} />
          GitHub
        </a>
        <a
          href="https://jleo.me"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-accent-on
                     text-sm font-medium hover:bg-accent-hover transition-colors duration-[150ms]"
        >
          <ExternalLink size={15} strokeWidth={1.5} />
          jleo.me
        </a>
        <Link
          href="/trails"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border
                     text-sm text-text-soft hover:text-text hover:bg-surface-muted
                     transition-colors duration-[150ms]"
        >
          Browse trails →
        </Link>
      </section>

    </div>
  );
}
