"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Step } from "@/lib/launch";

type Launch = { name: string; status: "LAUNCHING" | "LIVE" | "FAILED"; url: string | null; steps: Step[]; error: string | null };

const ICON = { waiting: "○", running: "◌", done: "✓", failed: "✗" } as const;

export function Progress({ id, initial }: { id: string; initial: Launch }) {
  const [launch, setLaunch] = useState(initial);

  useEffect(() => {
    if (launch.status !== "LAUNCHING") return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/launch/${id}`, { cache: "no-store" }).catch(() => null);
      if (res?.ok) setLaunch(await res.json());
    }, 2500);
    return () => clearInterval(timer);
  }, [id, launch.status]);

  const done = launch.steps.filter((s) => s.state === "done").length;
  const pct = Math.round((done / launch.steps.length) * 100);

  return (
    <section className="aero settings-card launch-progress">
      <div className={`rocket ${launch.status.toLowerCase()}`} aria-hidden>🚀</div>
      <h2>
        {launch.status === "LIVE" ? `${launch.name} is in orbit!` : launch.status === "FAILED" ? "The launch hit a snag" : `Launching ${launch.name}`}
      </h2>
      <div className="progress" style={{ width: "100%" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <b style={{ width: `${pct}%` }} />
      </div>
      <ol className="launch-steps" aria-live="polite">
        {launch.steps.map((s) => (
          <li key={s.key} className={s.state}>
            <span className="step-icon" aria-hidden>{ICON[s.state]}</span>
            <span>
              {s.label}
              {s.detail && <span className="muted step-detail">{s.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
      {launch.status === "LIVE" && launch.url && (
        <div className="actions">
          <a className="pill" href={launch.url} target="_blank" rel="noreferrer">🔗 <span>Visit your site</span></a>
          <a className="pill purple" href={`${launch.url}/admin/`} target="_blank" rel="noreferrer">✏️ <span>Start editing</span></a>
          <Link className="pill glass" href="/">Mission Control</Link>
        </div>
      )}
      {launch.status === "FAILED" && (
        <p className="form-error">Something went wrong{launch.error ? `: ${launch.error}` : ""}. We&apos;ve been told and will sort it out.</p>
      )}
    </section>
  );
}
