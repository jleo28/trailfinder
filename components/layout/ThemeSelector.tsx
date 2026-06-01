"use client";

import { useRef, useState, useEffect } from "react";
import { Sun, Moon, Clock, Monitor, Check } from "lucide-react";
import { useTheme } from "@/lib/hooks/useTheme";
import type { ThemeMode } from "@/lib/hooks/useTheme";

const OPTIONS: {
  value: ThemeMode;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}[] = [
  { value: "auto", label: "Auto", Icon: Clock },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

const BUTTON_ICON: Record<ThemeMode, React.ComponentType<{ size?: number }>> = {
  auto: Clock,
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
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

  const ActiveIcon = BUTTON_ICON[theme];

  return (
    <div ref={containerRef} className="relative">
      {/* suppressHydrationWarning: server renders "auto"/Clock, client may differ */}
      <button
        suppressHydrationWarning
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-md text-text-muted
                   hover:text-text hover:bg-surface-muted transition-colors duration-[150ms]"
      >
        <ActiveIcon size={18} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Theme"
          className="absolute right-0 top-full mt-1.5 glass rounded-lg p-1 z-50 w-36"
        >
          {OPTIONS.map(({ value, label, Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                role="option"
                aria-selected={active}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm
                            transition-colors duration-[150ms] ${
                              active
                                ? "text-accent bg-accent-soft"
                                : "text-text-soft hover:text-text hover:bg-surface-muted"
                            }`}
              >
                <Icon size={15} />
                <span>{label}</span>
                {active && <Check size={13} className="ml-auto text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
