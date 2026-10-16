"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Step } from "@/lib/launch";
import { RetryButton } from "@/app/sites/SiteButtons";
import { LaunchScene } from "./LaunchScene";

type Launch = { name: string; status: "LAUNCHING" | "LIVE" | "FAILED"; url: string | null; steps: Step[]; error: string | null };

export function Progress({ id, initial, canRetry }: { id: string; initial: Launch; canRetry: boolean }) {
  const [launch, setLaunch] = useState(initial);

  useEffect(() => {
    if (launch.status !== "LAUNCHING") return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/launch/${id}`, { cache: "no-store" }).catch(() => null);
      if (res?.ok) setLaunch(await res.json());
    }, 2500);
    return () => clearInterval(timer);
  }, [id, launch.status]);

  return (
    <section className="aero settings-card launch-progress">
      <h2>
        {launch.status === "LIVE" ? `${launch.name} is in orbit!` : launch.status === "FAILED" ? "The launch hit a snag" : `Launching ${launch.name}`}
      </h2>
      <LaunchScene steps={launch.steps} status={launch.status} />
      {launch.status === "LIVE" && launch.url && (
        <div className="actions">
          <a className="pill" href={launch.url} target="_blank" rel="noreferrer">🔗 <span>Visit your site</span></a>
          <a className="pill purple" href={`${launch.url}/admin/`} target="_blank" rel="noreferrer">✏️ <span>Start editing</span></a>
          <Link className="pill glass" href="/">Mission Control</Link>
        </div>
      )}
      {launch.status === "FAILED" && (
        <>
          <p className="form-error">Something went wrong{launch.error ? `: ${launch.error}` : ""}.</p>
          {canRetry ? <RetryButton slug={id} /> : <p className="muted">The site&apos;s owner can retry the launch.</p>}
        </>
      )}
    </section>
  );
}
