"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, LogOut, Settings, User } from "lucide-react";
import { NAV_LINKS } from "@/components/layout/Header";
import { signOut } from "@/app/actions/auth";
import type { AuthProfile } from "@/components/layout/AuthMenu";

interface NavMobileProps {
  open: boolean;
  onClose: () => void;
  profile: AuthProfile | null;
}

export function NavMobile({ open, onClose, profile }: NavMobileProps) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-[250ms] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal
        aria-label="Navigation"
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-bg-elevated shadow-xl
                    transform transition-transform duration-[250ms] ease-out ${
                      open ? "translate-x-0" : "translate-x-full"
                    }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="font-serif text-lg text-text">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted
                       hover:text-text hover:bg-surface-muted transition-colors duration-[150ms]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile identity strip */}
        {profile && (
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-accent-soft flex items-center justify-center">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-accent">
                  {profile.display_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text truncate">{profile.display_name}</p>
              <p className="text-xs text-text-muted truncate">@{profile.username}</p>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5 p-3" aria-label="Mobile">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center rounded-md px-3 py-2.5 text-sm font-medium text-text-soft
                         hover:text-text hover:bg-surface-muted transition-colors duration-[150ms]"
            >
              {label}
            </Link>
          ))}

          {profile && (
            <>
              <Link
                href={`/u/${profile.username}`}
                onClick={onClose}
                className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-text-soft
                           hover:text-text hover:bg-surface-muted transition-colors duration-[150ms]"
              >
                <User size={15} />
                Profile
              </Link>
              <Link
                href="/settings"
                onClick={onClose}
                className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-text-soft
                           hover:text-text hover:bg-surface-muted transition-colors duration-[150ms]"
              >
                <Settings size={15} />
                Settings
              </Link>
            </>
          )}
        </nav>

        {/* Footer: sign in or sign out */}
        <div className="mt-auto border-t border-border p-4">
          {profile ? (
            <form action={signOut}>
              <button
                type="submit"
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md
                           text-sm font-medium text-danger hover:bg-danger/10 transition-colors duration-[150ms]"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/signin"
              onClick={onClose}
              className="flex h-10 w-full items-center justify-center rounded-md bg-accent text-sm
                         font-medium text-accent-on hover:bg-accent-hover transition-colors duration-[150ms]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
