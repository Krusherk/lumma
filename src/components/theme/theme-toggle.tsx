"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "lumma-theme";
type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      onClick={() => {
        const nextTheme: Theme = theme === "light" ? "dark" : "light";
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
      className="fixed right-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-lumma-ink/25 bg-lumma-sand/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-lumma-ink shadow-lg backdrop-blur transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-lumma-sky"
      aria-label="Toggle theme"
      type="button"
    >
      {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
