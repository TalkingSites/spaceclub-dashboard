"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

// ⚙️ + first name in the header. Opens a glass panel with who you are, the theme,
// profile settings and log out. Closes on Escape or a click outside.
export function UserMenu({ name, email, logout }: { name: string; email?: string | null; logout: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const first = name.split(" ")[0];

  return (
    <div className="user-menu" ref={ref}>
      <button className="pill glass" type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden>⚙️</span> <span>{first}</span> <span aria-hidden className="caret">▾</span>
      </button>
      {open && (
        <div className="aero user-panel" role="menu">
          <div className="who">
            <div className="avatar" aria-hidden>{first.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{name}</strong>
              {email && <span className="muted">{email}</span>}
            </div>
          </div>
          <div className="row">
            <span className="muted">Theme</span>
            <ThemeToggle />
          </div>
          <Link className="pill glass" href="/settings" role="menuitem" onClick={() => setOpen(false)}>
            👤 <span>Profile settings</span>
          </Link>
          {logout}
        </div>
      )}
    </div>
  );
}
