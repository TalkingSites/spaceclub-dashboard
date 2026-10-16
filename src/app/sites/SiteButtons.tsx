"use client";

import { useActionState } from "react";
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
  return (
    <form action={action} className="profile-form">
      <input type="hidden" name="slug" value={slug} />
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
