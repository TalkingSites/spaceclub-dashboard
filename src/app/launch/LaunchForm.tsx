"use client";

import { useActionState, useState } from "react";
import { launch, type LaunchState } from "./actions";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 32).replace(/^-|-$/g, "");

export function LaunchForm({ domain }: { domain: string }) {
  const [state, action, pending] = useActionState<LaunchState, FormData>(launch, {});
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const address = (touched ? slug : slugify(name)) || "your-site";

  return (
    <form action={action} className="profile-form">
      <label>
        <span>Site name</span>
        <input name="name" required maxLength={80} placeholder="e.g. Fitzroy Community Garden" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        <span>Address</span>
        <input
          name="slug"
          value={touched ? slug : slugify(name)}
          onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value)); }}
          pattern="[a-z][a-z0-9-]{1,30}[a-z0-9]"
          placeholder="your-site"
        />
        <span className="muted" style={{ fontWeight: 400, fontSize: ".9rem" }}>
          🌐 https://<strong>{address}</strong>.{domain}
        </span>
      </label>
      <div className="form-foot">
        <button className="pill green" disabled={pending}>
          <span>{pending ? "Checking..." : "🚀 Launch site"}</span>
        </button>
        {state.error && <span role="status" className="form-error">{state.error}</span>}
      </div>
    </form>
  );
}
