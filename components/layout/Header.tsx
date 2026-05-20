"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { ThemeSelector } from "@/components/layout/ThemeSelector";
import { NavMobile } from "@/components/layout/NavMobile";
import { AuthMenu, type AuthProfile } from "@/components/layout/AuthMenu";
import { OPEN_SEARCH_EVENT } from "@/components/ui/CommandPalette";

export const NAV_LINKS = [
  { href: "/trails", label: "Browse" },
  { href: "/feed", label: "Feed" },
  { href: "/friends", label: "Friends" },
];

interface HeaderProps {
  profile: AuthProfile | null;
  pendingRequestCount?: number;
}

export function Header({ profile, pendingRequestCount = 0 }: HeaderProps) {
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
                className="relative text-sm font-medium text-text-soft hover:text-text transition-colors duration-[150ms]"
              >
                {label}
                {label === "Friends" && pendingRequestCount > 0 && (
                  <span className="absolute -top-1 -right-2.5 w-2 h-2 rounded-full bg-danger" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right: search + theme picker + auth + mobile trigger */}
          <div className="flex items-center gap-1.5">
            {/* Search trigger — desktop pill, mobile icon */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT))}
              aria-label="Search trails"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-muted
                         text-text-muted text-xs hover:bg-surface transition-colors duration-[150ms]"
            >
              <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Search</span>
              <kbd className="ml-0.5 font-mono text-[10px] border border-border rounded px-1 py-0.5 leading-none">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT))}
              aria-label="Search trails"
              className="flex sm:hidden h-8 w-8 items-center justify-center rounded-md text-text-muted
                         hover:text-text hover:bg-surface-muted transition-colors duration-[150ms]"
            >
              <Search size={16} strokeWidth={1.5} />
            </button>

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
