"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";
import { signOut } from "@/app/actions/auth";

export type AuthProfile = {
  username: string;
  display_name: string;
  avatar_url: string | null;
};

interface AuthMenuProps {
  profile: AuthProfile | null;
}

export function AuthMenu({ profile }: AuthMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  // Signed out — simple Sign in CTA
  if (!profile) {
    return (
      <Link
        href="/signin"
        className="hidden md:inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm
                   font-medium text-accent-on hover:bg-accent-hover transition-colors duration-[150ms]"
      >
        Sign in
      </Link>
    );
  }

  // Signed in — avatar trigger + dropdown
  const initials = profile.display_name.charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden
                   ring-2 ring-transparent hover:ring-accent transition-all duration-[150ms]"
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-accent-soft text-xs font-semibold text-accent">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 glass rounded-lg p-1 z-50 w-52"
        >
          {/* Identity */}
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-sm font-medium text-text truncate">{profile.display_name}</p>
            <p className="text-xs text-text-muted truncate">@{profile.username}</p>
          </div>

          {/* Links */}
          <Link
            href={`/u/${profile.username}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-soft
                       hover:text-text hover:bg-surface-muted transition-colors duration-[150ms]"
          >
            <User size={15} />
            Profile
          </Link>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-soft
                       hover:text-text hover:bg-surface-muted transition-colors duration-[150ms]"
          >
            <Settings size={15} />
            Settings
          </Link>

          {/* Sign out — form action so it works without JS */}
          <form action={signOut} className="mt-1 border-t border-border pt-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm
                         text-danger hover:bg-danger/10 transition-colors duration-[150ms]"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
