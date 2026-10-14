"use client";

import { Clock, Plus } from "lucide-react";
import { useState } from "react";

// Sample data until support requests come from Vikunja or Trello
type Ticket = { id: number; title: string; status: "backlog" | "in-progress" | "done"; hours: number | null; progress?: number };

const SAMPLE: Ticket[] = [
  { id: 1, title: "Add new volunteer signup form", status: "in-progress", hours: 2.5, progress: 65 },
  { id: 2, title: "Update homepage hero section", status: "backlog", hours: 1.5 },
  { id: 3, title: "Fix mobile menu styling", status: "done", hours: 1 },
  { id: 4, title: "Add events calendar integration", status: "backlog", hours: 4 },
];

const HOURS = { total: 22, used: 8.5, inProgress: 3.5 };

const COLUMNS = [
  { key: "backlog", label: "Backlog", dot: "bg-slate-500" },
  { key: "in-progress", label: "In progress", dot: "bg-blue-500" },
  { key: "done", label: "Done", dot: "bg-emerald-500" },
] as const;

function Progress({ value }: { value: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-24 w-24">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} strokeWidth="8" fill="none" className="stroke-slate-500/30" />
        <circle cx="48" cy="48" r={r} strokeWidth="8" fill="none" stroke="url(#progress)" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} strokeLinecap="round" />
        <defs>
          <linearGradient id="progress" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{value}%</span>
    </div>
  );
}

export function SupportPanel() {
  const [tickets, setTickets] = useState(SAMPLE);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const available = HOURS.total - HOURS.used - HOURS.inProgress;
  const segments = [
    { label: "In progress", hours: HOURS.inProgress, className: "from-blue-500 to-blue-600", dot: "bg-blue-500" },
    { label: "Used", hours: HOURS.used, className: "from-purple-500 to-purple-600", dot: "bg-purple-500" },
    { label: "Available", hours: available, className: "from-emerald-500 to-emerald-600", dot: "bg-emerald-500" },
  ];

  function add() {
    if (!draft.trim()) return;
    setTickets((t) => [...t, { id: Date.now(), title: draft.trim(), status: "backlog", hours: null }]);
    setDraft("");
    setAdding(false);
  }

  return (
    <section className="card rounded-2xl p-6 shadow-xl sm:p-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-bold">Pro bono support</h2>
        <span className="rounded-full bg-amber-500/20 px-3 py-1 font-mono text-xs text-amber-400">sample data</span>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <p className="text-muted">Your mission fuel for this cycle</p>
          <p className="font-semibold">{HOURS.total} hours</p>
        </div>
        <div className="flex h-14 overflow-hidden rounded-xl">
          {segments.map((s) => (
            <div key={s.label} className={`flex items-center justify-center bg-gradient-to-r text-sm font-bold text-white ${s.className}`} style={{ width: `${(s.hours / HOURS.total) * 100}%` }}>
              {s.hours / HOURS.total > 0.18 && `${s.label}: ${s.hours}h`}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {segments.map((s) => (
            <span key={s.label} className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded ${s.dot}`} /> {s.label}: {s.hours}h
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = tickets.filter((t) => t.status === col.key);
          return (
            <div key={col.key}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <span className={`h-3 w-3 rounded-full ${col.dot}`} /> {col.label} ({items.length})
                </h3>
                {col.key === "backlog" && (
                  <button onClick={() => setAdding(true)} aria-label="New request" className="rounded p-1 hover:bg-inset">
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>

              {col.key === "backlog" && adding && (
                <div className="mb-3 rounded-lg bg-inset p-4">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && add()}
                    placeholder="Describe your request..."
                    className="mb-2 w-full rounded bg-card px-3 py-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={add} className="flex-1 rounded bg-gradient-to-r from-[#111e6c] to-purple-600 px-3 py-2 text-sm font-medium text-white">Add to backlog</button>
                    <button onClick={() => { setAdding(false); setDraft(""); }} className="rounded bg-card px-3 py-2 text-sm">Cancel</button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {items.map((t) => (
                  <div key={t.id} className={`rounded-lg bg-inset p-4 ${t.status === "done" ? "opacity-75" : ""}`}>
                    <h4 className={`mb-2 font-semibold ${t.status === "done" ? "line-through" : ""}`}>{t.title}</h4>
                    <p className="mb-2 text-sm text-muted">
                      <Clock className="mr-1 inline h-4 w-4" />
                      {t.hours === null ? "Awaiting estimate" : `${t.hours} hours`}
                    </p>
                    {t.status === "in-progress" && <Progress value={t.progress ?? 0} />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
