"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileState } from "./actions";

export function ProfileForm({ name, username, email }: { name: string; username: string; email: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});

  return (
    <form action={action} className="profile-form">
      <label>
        <span>Display name</span>
        <input name="name" defaultValue={name} required autoComplete="name" />
      </label>
      <label>
        <span>Username</span>
        <input name="username" defaultValue={username} required autoComplete="username" />
      </label>
      <label>
        <span>Email</span>
        <input name="email" type="email" defaultValue={email} required autoComplete="email" />
      </label>
      <div className="form-foot">
        <button className="pill green" disabled={pending}>
          <span>{pending ? "Saving..." : "Save changes"}</span>
        </button>
        <span role="status" className={state.error ? "form-error" : "muted"}>{state.error ?? state.ok}</span>
      </div>
    </form>
  );
}
