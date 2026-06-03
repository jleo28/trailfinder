"use client";

import { useEffect, useState } from "react";

type Visibility = "public" | "friends" | "private";

const OPTIONS: { value: Visibility; label: string; description: string }[] = [
  {
    value: "friends",
    label: "Friends",
    description: "Visible to accepted friends",
  },
  {
    value: "public",
    label: "Public",
    description: "Visible to everyone",
  },
  {
    value: "private",
    label: "Private",
    description: "Only visible to you",
  },
];

export const VISIBILITY_PREF_KEY = "hike-visibility-default";

export function VisibilityPreference() {
  const [value, setValue] = useState<Visibility>("friends");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(VISIBILITY_PREF_KEY) as Visibility | null;
    if (stored) setValue(stored);
  }, []);

  function handleChange(v: Visibility) {
    setValue(v);
    localStorage.setItem(VISIBILITY_PREF_KEY, v);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-3">
      {OPTIONS.map(({ value: v, label, description }) => (
        <label key={v} className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="default-visibility"
            value={v}
            checked={value === v}
            onChange={() => handleChange(v)}
            className="mt-0.5 accent-accent"
          />
          <div>
            <p className="text-sm font-medium text-text capitalize">{label}</p>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
        </label>
      ))}
      {saved && (
        <p className="text-xs text-accent font-mono animate-pulse">Saved.</p>
      )}
    </div>
  );
}
