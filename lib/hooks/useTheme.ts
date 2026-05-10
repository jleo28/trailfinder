"use client";

import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "auto" | "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  return (localStorage.getItem("theme") as ThemeMode | null) ?? "auto";
}

function getResolved(mode: ThemeMode): ResolvedTheme {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  // auto: light 6am–6pm, dark 6pm–6am
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

function applyTheme(resolved: ResolvedTheme) {
  const el = document.documentElement;
  if (resolved === "dark") {
    el.setAttribute("data-theme", "dark");
  } else {
    el.removeAttribute("data-theme");
  }
}

export function useTheme() {
  // Lazy initialisers read localStorage on the client's first render.
  // Server returns safe defaults ("auto" / "light"), which may differ from the
  // client — ThemeSelector suppresses that one-time hydration mismatch.
  const [theme, setThemeState] = useState<ThemeMode>(getStoredMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    typeof window !== "undefined" ? getResolved(getStoredMode()) : "light"
  );

  // Re-resolve every minute so auto mode flips at 6am/6pm in a long-open tab.
  // setState is called from the async setInterval callback, not the effect body.
  useEffect(() => {
    const tick = () => {
      if (getStoredMode() !== "auto") return;
      const next = getResolved("auto");
      setResolvedTheme(next);
      applyTheme(next);
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Follow OS preference changes for system mode.
  // setState is called from the async event callback, not the effect body.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredMode() !== "system") return;
      const next = getResolved("system");
      setResolvedTheme(next);
      applyTheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    localStorage.setItem("theme", next);
    setThemeState(next);
    const resolved = getResolved(next);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  return { theme, setTheme, resolvedTheme };
}
