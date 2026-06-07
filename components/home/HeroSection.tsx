"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export function HeroSection({ photos }: { photos: string[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 5000);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <div className="relative aspect-[16/9] md:aspect-[21/9] md:max-h-[640px] overflow-hidden bg-surface-muted">
      {/* Rotating hero photos */}
      {photos.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          priority={i === 0}
          loading={i === 0 ? undefined : "lazy"}
          sizes="100vw"
          className={[
            "object-cover transition-opacity duration-[1200ms] ease-in-out",
            i === idx ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      ))}

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(22,20,15,0.78) 0%, rgba(22,20,15,0.18) 45%, transparent 65%)",
        }}
      />

      {/* Content */}
      <div className="absolute bottom-0 left-0 px-6 pb-10 md:px-16 md:pb-20">
        <h1
          className="font-serif text-4xl md:text-[3.5rem] font-semibold text-white leading-[1.05] mb-4 max-w-xl"
          style={{ letterSpacing: "-0.02em" }}
        >
          Find your next<br className="hidden sm:block" /> LA trail.
        </h1>
        <p className="text-sm md:text-base text-white/72 mb-8 max-w-sm leading-relaxed">
          Browse 35+ hand-curated hikes from Griffith to the Gabriels. Log your adventures and share with friends.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/trails"
            className="px-6 py-2.5 rounded-md bg-accent text-accent-on text-sm font-medium
                       hover:bg-accent-hover transition-colors duration-[150ms]"
          >
            Browse trails →
          </Link>
          <Link
            href="/signup"
            className="px-6 py-2.5 rounded-md border border-white/40 text-white text-sm font-medium
                       hover:border-white/65 hover:bg-white/10 transition-colors duration-[150ms]"
          >
            Get started free
          </Link>
        </div>

        {/* Rotation dots */}
        {photos.length > 1 && (
          <div className="flex items-center gap-1.5 mt-7">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`View photo ${i + 1}`}
                className={[
                  "h-1 rounded-full transition-all duration-[300ms]",
                  i === idx ? "w-6 bg-white" : "w-2 bg-white/35 hover:bg-white/55",
                ].join(" ")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
