"use client";

import type { Step } from "@/lib/launch";

// The launch as a climb through the atmosphere: each step is a layer, the rocket sits in
// the layer being worked on, and the site is live when it reaches orbit.
const LAYERS = ["Troposphere", "Stratosphere", "Mesosphere", "Thermosphere", "Exosphere", "Orbit"];

// A glossy chrome rocket, pointing up
function Rocket() {
  return (
    <svg viewBox="0 0 40 72" width="40" height="72" className="rocket-svg">
      <defs>
        <linearGradient id="rk-body" x1="0" x2="1">
          <stop offset="0" stopColor="#9fb8d6" /><stop offset=".35" stopColor="#ffffff" /><stop offset=".6" stopColor="#e3eefa" /><stop offset="1" stopColor="#7d97b8" />
        </linearGradient>
        <linearGradient id="rk-fin" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7cf3ff" /><stop offset=".5" stopColor="#14a7e6" /><stop offset="1" stopColor="#0a5fae" />
        </linearGradient>
        <radialGradient id="rk-window" cx=".35" cy=".3" r=".75">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".25" stopColor="#b8f6ff" /><stop offset=".6" stopColor="#1fb6ef" /><stop offset="1" stopColor="#06508f" />
        </radialGradient>
      </defs>
      <path d="M9 40 L1 56 L1 62 L11 56 Z" fill="url(#rk-fin)" />
      <path d="M31 40 L39 56 L39 62 L29 56 Z" fill="url(#rk-fin)" />
      <path d="M20 1 C30 10 32 26 31 44 L30 58 L10 58 L9 44 C8 26 10 10 20 1 Z" fill="url(#rk-body)" stroke="#5f7da3" strokeWidth=".8" />
      <path d="M20 1 C26 7 29 14 30 22 L10 22 C11 14 14 7 20 1 Z" fill="url(#rk-fin)" opacity=".95" />
      <circle cx="20" cy="33" r="6.2" fill="url(#rk-window)" stroke="#4c6f99" strokeWidth="1.2" />
      <path d="M13 12 C14 24 14 40 15 54" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".85" fill="none" />
      <path d="M15 58 L25 58 L23 63 L17 63 Z" fill="#6b84a6" />
    </svg>
  );
}

export function LaunchScene({ steps, status }: { steps: Step[]; status: "LAUNCHING" | "LIVE" | "FAILED" }) {
  const live = status === "LIVE";
  const failedAt = steps.findIndex((s) => s.state === "failed");
  const runningAt = steps.findIndex((s) => s.state === "running");
  const doneCount = steps.filter((s) => s.state === "done").length;
  // where the rocket is: -1 on the pad, 0..5 in a layer (5 is orbit, where it circles once live)
  const level = live ? steps.length - 1 : failedAt >= 0 ? failedAt : runningAt >= 0 ? runningAt : doneCount ? doneCount : -1;
  const flying = !live && failedAt < 0 && runningAt >= 0;

  return (
    <div className={`sky ${live ? "live" : ""} ${failedAt >= 0 ? "failed" : ""}`} style={{ ["--level" as string]: level }}>
      <div className="aurora" aria-hidden />
      <span className="sky-sparkle s1" aria-hidden /><span className="sky-sparkle s2" aria-hidden /><span className="sky-sparkle s3" aria-hidden />
      <ol className="layers">
        {steps.map((s, i) => (
          <li key={s.key} className={`layer layer-${i} ${s.state} ${i === level ? "here" : ""}`}>
            <span className="capsule">
              <span className={`state-orb ${s.state}`} aria-label={s.state} />
              <span className="capsule-text">
                <span className="layer-name">{LAYERS[i]}</span>
                <span className="layer-step">{s.label}</span>
                {s.detail && s.state !== "done" && <span className="layer-detail">{s.detail}</span>}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <span className="bubble b1" aria-hidden /><span className="bubble b2" aria-hidden /><span className="bubble b3" aria-hidden /><span className="bubble b4" aria-hidden />
      <div className="pad-planet" aria-hidden />
      {live && <div className="orbit-ring" aria-hidden />}
      <div className={`ship ${flying ? "flying" : ""}`} aria-hidden>
        <span className="glow" />
        <Rocket />
        <span className="flame" />
        <span className="smoke" />
      </div>
    </div>
  );
}
