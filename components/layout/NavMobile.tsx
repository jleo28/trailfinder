"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { NAV_LINKS } from "@/components/layout/Header";

interface NavMobileProps {
  open: boolean;
  onClose: () => void;
}

export function NavMobile({ open, onClose }: NavMobileProps) {
  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
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
        </nav>

        <div className="mt-auto border-t border-border p-4">
          <Link
            href="/signin"
            onClick={onClose}
            className="flex h-10 w-full items-center justify-center rounded-md bg-accent text-sm
                       font-medium text-accent-on hover:bg-accent-hover transition-colors duration-[150ms]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </>
  );
}
