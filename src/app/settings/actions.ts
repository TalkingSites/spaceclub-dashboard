"use server";

import { auth, unstable_update } from "@/auth";
import { getMe, updateMe } from "@/lib/authentik";

export type ProfileState = { ok?: string; error?: string };

export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user) return { error: "Please log in again." };

  const name = String(form.get("name") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  if (!name || !username) return { error: "Display name and username can't be empty." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right." };

  try {
    const me = await getMe(session.user.id, session.user.username);
    if (!me) return { error: "Couldn't find your account. Try logging out and in again." };
    await updateMe(me.pk, { name, username, email });
    await unstable_update({ user: { name, email, username } });
    return { ok: "Saved." };
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[settings] ${message}`);
    if (message.includes("username")) return { error: "That username is taken." };
    return { error: "Couldn't save right now. Please try again." };
  }
}
