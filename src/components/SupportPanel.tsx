"use client";

import { useState } from "react";
import { HOURS } from "@/lib/support";

// Sample data until support requests come from Vikunja or Trello
type Ticket = { id: number; title: string; status: "waiting" | "progress" | "done"; hours: number | null; progress?: number };

const SAMPLE: Ticket[] = [
  { id: 1, title: "Update homepage hero", status: "waiting", hours: 1.5 },
  { id: 2, title: "Events calendar integration", status: "waiting", hours: 4 },
  { id: 3, title: "Volunteer sign-up form", status: "progress", hours: 2.5, progress: 65 },
  { id: 4, title: "Fix mobile menu styling", status: "done", hours: 1 },
];

const COLUMNS = [
  { key: "waiting", label: "Waiting" },
  { key: "progress", label: "In progress" },
  { key: "done", label: "Done" },
] as const;

export function SupportPanel() {
  const [tickets, setTickets] = useState(SAMPLE);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const left = HOURS.total - HOURS.used - HOURS.inProgress;
  const pct = (h: number) => `${(h / HOURS.total) * 100}%`;

  function add() {
    if (!draft.trim()) return;
    setTickets((t) => [...t, { id: Date.now(), title: draft.trim(), status: "waiting", hours: null }]);
    setDraft("");
    setAdding(false);
  }

  return (
    <section className="aero support">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <h2 style={{ fontSize: "1.5rem" }}>🚀 Pro bono support</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="soon">sample data</span>
          <button className="pill green" type="button" onClick={() => setAdding(true)}>
            + <span>New request</span>
          </button>
        </div>
      </div>

      <div>
        <div className="fuelbar">
          <div className="f-prog" style={{ width: pct(HOURS.inProgress) }}><span>{HOURS.inProgress}h</span></div>
          <div className="f-used" style={{ width: pct(HOURS.used) }}><span>Used {HOURS.used}h</span></div>
          <div className="f-left" style={{ width: pct(left) }}><span>Left {left}h</span></div>
        </div>
        <div className="legend" style={{ marginTop: 10 }}>
          <span><i style={{ background: "#18a9f0" }} />In progress {HOURS.inProgress}h</span>
          <span><i style={{ background: "#8a52f0" }} />Used {HOURS.used}h</span>
          <span><i style={{ background: "#3fcf5a" }} />Left {left}h of {HOURS.total}h</span>
        </div>
      </div>

      {adding && (
        <div className="well" style={{ padding: 14, display: "grid", gap: 10 }}>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="What would you like help with?"
            className="ticket"
            style={{ font: "inherit" }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button className="pill" type="button" onClick={add}><span>Add request</span></button>
            <button className="pill glass" type="button" onClick={() => { setAdding(false); setDraft(""); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="board">
        {COLUMNS.map((col) => {
          const items = tickets.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="well col">
              <h3>{col.label} <span className="muted">{items.length}</span></h3>
              {items.map((t) => (
                <div key={t.id} className={`ticket ${t.status === "done" ? "done" : ""}`}>
                  <span className="t">{t.title}</span>
                  <span className="h">
                    ⏱ {t.hours === null ? "awaiting estimate" : t.status === "progress" ? `${t.hours}h, ${t.progress}% done` : `${t.hours}h${t.status === "waiting" ? " estimate" : ""}`}
                  </span>
                  {t.status === "progress" && <div className="progress"><b style={{ width: `${t.progress}%` }} /></div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
