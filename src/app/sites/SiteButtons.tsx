"use client";

import { useActionState, useState } from "react";
import { remove, retry, type SiteActionState } from "./actions";

export function RetryButton({ slug, wide }: { slug: string; wide?: boolean }) {
  const [state, action, pending] = useActionState<SiteActionState, FormData>(retry, {});
  return (
    <form action={action} className="form-foot">
      <input type="hidden" name="slug" value={slug} />
      <button className={`pill green${wide ? " wide" : ""}`} disabled={pending}>
        🔁 <span>{pending ? "Restarting..." : "Retry launch"}</span>
      </button>
      {state.error && <span role="status" className="form-error">{state.error}</span>}
    </form>
  );
}

export function DeleteForm({ slug, name }: { slug: string; name: string }) {
  const [state, action, pending] = useActionState<SiteActionState, FormData>(remove, {});
  const [backup, setBackup] = useState(true);
  return (
    <form action={action} className="profile-form delete-form">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <h3 className="delete-head">What happens</h3>
        <ul className="delete-list">
          <li className="gone">The site goes offline</li>
          <li className="gone">Its editing login is removed</li>
          <li className="gone">Its visitor stats are removed</li>
          <li className="kept">The name &ldquo;{slug}&rdquo; can be used again</li>
          <li className="choice">
            <label className="check">
              <input type="checkbox" name="keepBackup" checked={backup} onChange={(e) => setBackup(e.target.checked)} />
              <span>Keep a backup</span>
            </label>
            <span className="info-dot" tabIndex={0} role="note" aria-label="Keeps the site's pages, posts and images saved on GitHub. Unticking this deletes them for good.">
              i<span className="info-tip">Keeps the site&apos;s pages, posts and images saved on GitHub. Unticking this deletes them for good, and it can&apos;t be undone.</span>
            </span>
          </li>
        </ul>
      </div>
      <label>
        <span>Type <b>{name}</b> to confirm</span>
        <input name="confirm" required autoComplete="off" spellCheck={false} />
      </label>
      <div className="form-foot">
        <button className="pill red" disabled={pending}>
          🗑️ <span>{pending ? "Deleting..." : "Delete site"}</span>
        </button>
        {state.error && <span role="status" className="form-error">{state.error}</span>}
      </div>
    </form>
  );
}

// The danger zone: risky actions, one row each. A row is just a heading that opens its
// confirmation underneath (it isn't a button that looks like it does the deed); the only
// destructive button is the final one inside. Only deleting the site for now; more rows
// can be added later.
export function DangerZone({ slug, name, launching }: { slug: string; name: string; launching: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const row = (id: string, title: string, about: string, body: React.ReactNode) => (
    <div className={`danger-row${open === id ? " open" : ""}`}>
      <button type="button" className="danger-head" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
        <span className="danger-chevron" aria-hidden />
        <span>
          <b>{title}</b>
          <span className="muted">{about}</span>
        </span>
      </button>
      {open === id && body}
    </div>
  );
  return (
    <div className="danger-rows">
      {row("delete", "Delete this site", "Takes it offline and frees the name.",
        launching ? <p className="muted">You can delete it once the launch finishes or fails.</p> : <DeleteForm slug={slug} name={name} />)}
    </div>
  );
}
