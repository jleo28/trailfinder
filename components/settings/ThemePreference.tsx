"use client";

import { Clock, Sun, Moon, Monitor, type LucideProps } from "lucide-react";
import { useTheme } from "@/lib/hooks/useTheme";
import type { ThemeMode } from "@/lib/hooks/useTheme";

const OPTIONS: { value: ThemeMode; label: string; description: string; Icon: React.ComponentType<LucideProps> }[] = [
  { value: "auto",   label: "Auto",   description: "Light 6am–6pm, dark 6pm–6am", Icon: Clock },
  { value: "light",  label: "Light",  description: "Always light",                Icon: Sun },
  { value: "dark",   label: "Dark",   description: "Always dark",                 Icon: Moon },
  { value: "system", label: "System", description: "Follows OS preference",       Icon: Monitor },
];

export function ThemePreference() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ value, label, description, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={`flex items-start gap-3 rounded-lg border p-3.5 text-left
                        transition-[border-color,background-color] duration-[150ms] ${
                          active
                            ? "border-accent bg-accent-soft"
                            : "border-border bg-surface hover:bg-surface-muted"
                        }`}
          >
            <Icon
              size={16}
              strokeWidth={1.5}
              className={active ? "text-accent mt-0.5" : "text-text-muted mt-0.5"}
            />
            <div>
              <p className={`text-sm font-medium ${active ? "text-accent" : "text-text"}`}>
                {label}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
