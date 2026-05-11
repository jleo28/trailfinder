"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { ThemeSelector } from "@/components/layout/ThemeSelector";
import { NavMobile } from "@/components/layout/NavMobile";
import { AuthMenu, type AuthProfile } from "@/components/layout/AuthMenu";

export const NAV_LINKS = [
  { href: "/trails", label: "Browse" },
  { href: "/feed", label: "Feed" },
  { href: "/friends", label: "Friends" },
];

interface HeaderProps {
  profile: AuthProfile | null;
}

export function Header({ profile }: HeaderProps) {
  const [scrolled, setScrolled] = useState(() =>
    typeof window !== "undefined" && window.scrollY > 48
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-[250ms] ${
          scrolled
            ? "glass border-b border-border/60"
            : "bg-bg border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-6">
          {/* Logo */}
          <Link
            href="/"
            className="font-serif text-xl text-text tracking-tight hover:text-accent transition-colors duration-[150ms]"
          >
            TrailFinder
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-text-soft hover:text-text transition-colors duration-[150ms]"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right: theme picker + auth + mobile trigger */}
          <div className="flex items-center gap-1.5">
            <ThemeSelector />
            <AuthMenu profile={profile} />

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="flex md:hidden h-8 w-8 items-center justify-center rounded-md text-text-muted
                         hover:text-text hover:bg-surface-muted transition-colors duration-[150ms]"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <NavMobile open={mobileOpen} onClose={() => setMobileOpen(false)} profile={profile} />
    </>
  );
}
