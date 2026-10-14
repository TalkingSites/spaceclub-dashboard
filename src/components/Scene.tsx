// The space backdrop: glossy Earth horizon, planets on orbits, a satellite, comets,
// lens-flare sparkles and stars. Positions are seeded so server and browser match.
import type { CSSProperties } from "react";

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

const css = (vars: Record<string, string | number>) => vars as CSSProperties;

export function Scene() {
  const rand = seeded(7);
  const stars = Array.from({ length: 90 }, () => ({ z: rand() * 2.5 + 1, left: rand() * 100, top: rand() * 100, t: rand() * 4 + 2 }));
  const sparkles = Array.from({ length: 16 }, () => ({ z: rand() * 22 + 10, left: rand() * 100, top: rand() * 70, t: rand() * 3 + 2.5, d: rand() * 5 }));

  return (
    <div className="scene" aria-hidden>
      <div className="aurora-glow" />
      <div className="ray" style={css({ left: "8%", "--r": "18deg" })} />
      <div className="ray" style={css({ left: "38%", "--r": "12deg" })} />
      <div className="ray" style={css({ left: "70%", "--r": "22deg" })} />
      {stars.map((s, i) => (
        <span key={i} className="star" style={css({ width: s.z, height: s.z, left: `${s.left}%`, top: `${s.top}%`, "--t": `${s.t}s` })} />
      ))}
      <div className="earth" />
      <div className="orbit" style={css({ width: 420, height: 420, right: -130, top: -10, "--tilt": "-18deg" })}>
        <div className="moon-path" style={css({ "--t": "26s" })}>
          <div className="moon" style={css({ "--c1": "#ffe9a8", "--c2": "#f59a2a" })} />
        </div>
      </div>
      <div className="planet" style={css({ width: 200, height: 200, right: -20, top: 100, "--c1": "#9ff2ff", "--c2": "#2a8ff0", "--c3": "#111e6c", "--glow": "rgba(80,200,255,.5)", "--t": "14s", "--dx": "-14px", "--dy": "12px" })}>
        <div className="ring" />
      </div>
      <div className="orbit" style={css({ width: 260, height: 260, left: -90, top: "42%", "--tilt": "24deg" })}>
        <div className="moon-path" style={css({ "--t": "18s" })}>
          <div className="moon" style={css({ "--c1": "#e7ccff", "--c2": "#8a52f0" })} />
        </div>
      </div>
      <div className="planet" style={css({ width: 110, height: 110, left: -15, top: "calc(42% + 75px)", "--c1": "#c9ffd9", "--c2": "#28c27a", "--c3": "#0b5e57", "--glow": "rgba(80,255,180,.45)", "--t": "11s", "--dx": "10px", "--dy": "-10px" })} />
      <div className="planet" style={css({ width: 64, height: 64, left: "44%", top: "9%", "--c1": "#f0ddff", "--c2": "#9b5cf0", "--c3": "#3a1a8a", "--glow": "rgba(170,110,255,.5)", "--t": "9s", "--dx": "12px", "--dy": "10px" })} />
      <div className="satellite" style={{ top: 0, left: 0 }}>🛰️</div>
      <span className="comet" style={css({ left: "5%", top: "6%", "--t": "9s", "--d": "1s" })} />
      <span className="comet" style={css({ left: "35%", top: "2%", "--t": "13s", "--d": "6s" })} />
      <span className="comet" style={css({ left: "60%", top: "12%", "--t": "17s", "--d": "11s" })} />
      {sparkles.map((s, i) => (
        <span key={i} className="sparkle" style={css({ "--z": `${s.z}px`, left: `${s.left}%`, top: `${s.top}%`, "--t": `${s.t}s`, "--d": `-${s.d}s` })} />
      ))}
    </div>
  );
}
