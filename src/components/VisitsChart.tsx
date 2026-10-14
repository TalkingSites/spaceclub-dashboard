"use client";

import { useRef, useState } from "react";

// Visits per day: one series, so no legend (the heading names it). A crosshair snaps
// to the nearest day on hover, arrow keys step through days, and a table view holds
// every value without hovering.
type Point = { date: string; visits: number };

const W = 720;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

export function VisitsChart({ data }: { data: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(4, ...data.map((d) => d.visits));
  const niceMax = Math.ceil(max / 4) * 4;
  const x = (i: number) => PAD.left + (i / Math.max(1, data.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / niceMax) * (H - PAD.top - PAD.bottom);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.visits).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const ticks = [0, niceMax / 2, niceMax];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (data.length - 1));
    setActive(Math.min(data.length - 1, Math.max(0, i)));
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
    if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? data.length) - 1));
    if (e.key === "Escape") setActive(null);
  }

  const a = active !== null ? data[active] : null;

  return (
    <div className="chart">
      <div className="chart-head">
        <h3>Visits per day</h3>
        <button className="pill glass" type="button" onClick={() => setTable((t) => !t)} aria-pressed={table}>
          {table ? "📈 Chart" : "🗒️ Table"}
        </button>
      </div>

      {table ? (
        <div className="chart-table">
          <table>
            <thead><tr><th>Day</th><th>Visits</th></tr></thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date}><td>{fmtDay(d.date)}</td><td>{d.visits}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-plot">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Visits per day for the last ${data.length} days. Use arrow keys to read each day.`}
            tabIndex={0}
            onPointerMove={onMove}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
          >
            <defs>
              <linearGradient id="visits-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--series)" stopOpacity=".35" />
                <stop offset="1" stopColor="var(--series)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="grid" />
                <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
              </g>
            ))}
            {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) => (
              <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="axis">
                {data[i] && fmtDay(data[i].date)}
              </text>
            ))}
            <path d={area} fill="url(#visits-fill)" />
            <path d={line} fill="none" stroke="var(--series)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {a && active !== null && (
              <g>
                <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} className="crosshair" />
                <circle cx={x(active)} cy={y(a.visits)} r="5" fill="var(--series)" className="marker" />
              </g>
            )}
          </svg>
          {a && active !== null && (
            <div
              className="chart-tip"
              style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(a.visits) / H) * 100}%` }}
              role="status"
            >
              <strong>{a.visits} visits</strong>
              <span>{fmtDay(a.date)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
