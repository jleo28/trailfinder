"use client";

import Link from "next/link";
import { useState } from "react";

export interface StampData {
  trailName: string;
  trailSlug: string;
  /** ISO date string — "YYYY-MM-DD" */
  hikedAt: string;
}

interface Props {
  stamps: StampData[];
}

// Deterministic hash → small integer
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Split a trail name into at most 2 lines that fit inside the stamp circle.
// Each line ≤ 12 chars so text stays inside the inner ring at 13px.
function splitName(name: string): [string, string] {
  const truncated = name.length > 26 ? name.slice(0, 24) + "…" : name;
  const words = truncated.split(" ");
  let line1 = "";
  let line2 = "";
  for (const word of words) {
    const candidate = line1 ? `${line1} ${word}` : word;
    if (!line2 && candidate.length <= 12) {
      line1 = candidate;
    } else {
      line2 = line2 ? `${line2} ${word}` : word;
    }
  }
  // If line2 is still too long, truncate
  if (line2.length > 13) line2 = line2.slice(0, 12) + "…";
  return [line1, line2];
}

function formatStampDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
    year: String(d.getFullYear()),
  };
}

function Stamp({ trailName, trailSlug, hikedAt, index }: StampData & { index: number }) {
  const [hovered, setHovered] = useState(false);

  const hash = hashString(trailSlug);
  // Rotation: center at -3deg ± 4deg, seeded per trail so it's stable on re-renders
  const rng = ((hash * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  const rotation = -3 + (rng - 0.5) * 8;
  // Different turbulence seed per stamp so borders look distinct
  const turbSeed = (hash % 98) + 2;
  const filterId = `stamp-rough-${index}`;

  const [line1, line2] = splitName(trailName);
  const { month, day, year } = formatStampDate(hikedAt);

  return (
    <Link
      href={`/trails/${trailSlug}`}
      className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      aria-label={`${trailName}, hiked ${month} ${day} ${year}`}
      style={{ position: "relative", zIndex: hovered ? 10 : 1 }}
    >
      <div
        className="relative w-[148px] h-[148px] text-text-soft select-none"
        style={{
          transform: hovered
            ? "translateY(-8px) rotate(0deg)"
            : `rotate(${rotation}deg)`,
          transition: "transform 150ms var(--ease-out)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Rough SVG rings — feTurbulence gives the inked-stamp irregular edge */}
        <svg
          width="148"
          height="148"
          viewBox="0 0 148 148"
          fill="none"
          aria-hidden="true"
          className="absolute inset-0"
        >
          <defs>
            <filter
              id={filterId}
              x="-15%"
              y="-15%"
              width="130%"
              height="130%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.04"
                numOctaves="4"
                seed={turbSeed}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="4"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
          {/* Outer border */}
          <circle
            cx="74"
            cy="74"
            r="68"
            stroke="currentColor"
            strokeWidth="2.5"
            filter={`url(#${filterId})`}
          />
          {/* Inner border */}
          <circle
            cx="74"
            cy="74"
            r="60"
            stroke="currentColor"
            strokeWidth="1.2"
            filter={`url(#${filterId})`}
          />
        </svg>

        {/* Centered text inside the rings */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] opacity-55 mb-1.5">
            Hiked
          </p>
          {line2 ? (
            <>
              <p className="font-serif text-[12px] font-semibold leading-[1.25]">
                {line1}
              </p>
              <p className="font-serif text-[12px] font-semibold leading-[1.25]">
                {line2}
              </p>
            </>
          ) : (
            <p className="font-serif text-[13px] font-semibold leading-[1.25]">
              {line1}
            </p>
          )}
          {/* Divider */}
          <div
            className="w-7 h-px my-2 opacity-25"
            style={{ background: "currentColor" }}
          />
          <p className="font-mono text-[10px] font-medium leading-none">
            {month} {day}
          </p>
          <p className="font-mono text-[9px] opacity-65 mt-1 leading-none">
            {year}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function TrailPassport({ stamps }: Props) {
  if (stamps.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif text-xl text-text-soft mb-2">No stamps yet.</p>
        <p className="text-sm text-text-muted">
          0 trails hiked.{" "}
          <Link
            href="/trails"
            className="underline hover:text-text transition-colors duration-[150ms]"
          >
            Get out there →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {stamps.map((stamp, i) => (
        <Stamp key={stamp.trailSlug} {...stamp} index={i} />
      ))}
    </div>
  );
}
