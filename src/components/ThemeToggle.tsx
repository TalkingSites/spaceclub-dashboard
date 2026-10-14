"use client";

import { useSyncExternalStore } from "react";

// System / Day / Night. The choice is kept in this browser; "system" follows the OS
// and updates live. layout.tsx applies it before first paint so there's no flash.
type Mode = "system" | "light" | "dark";

const MODES: { mode: Mode; label: string; icon: string }[] = [
  { mode: "system", label: "System", icon: "🖥️" },
  { mode: "light", label: "Day", icon: "☀️" },
  { mode: "dark", label: "Night", icon: "🌙" },
];

const dark = () => window.matchMedia("(prefers-color-scheme: dark)");

function readMode(): Mode {
  try {
    const m = localStorage.getItem("theme");
    if (m === "light" || m === "dark") return m;
  } catch {}
  return "system";
}

export function applyTheme(mode: Mode) {
  const night = mode === "dark" || (mode === "system" && dark().matches);
  document.documentElement.dataset.theme = night ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const media = dark();
  const onSystem = () => {
    if (readMode() === "system") applyTheme("system");
    onChange();
  };
  media.addEventListener("change", onSystem);
  window.addEventListener("themechange", onChange);
  return () => {
    media.removeEventListener("change", onSystem);
    window.removeEventListener("themechange", onChange);
  };
}

export function ThemeToggle() {
  const mode = useSyncExternalStore<Mode | null>(subscribe, readMode, () => null);

  function choose(next: Mode) {
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {}
    applyTheme(next);
    window.dispatchEvent(new Event("themechange"));
  }

  return (
    <div className="theme-switch" role="radiogroup" aria-label="Theme">
      {MODES.map(({ mode: m, label, icon }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          title={label}
          onClick={() => choose(m)}
        >
          <span aria-hidden>{icon}</span>
          <span className="theme-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
