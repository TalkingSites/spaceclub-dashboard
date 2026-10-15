"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMe } from "@/lib/authentik";
import { launchProblem, slugify, startLaunch } from "@/lib/launch";

export type LaunchState = { error?: string };

export async function launch(_prev: LaunchState, form: FormData): Promise<LaunchState> {
  const session = await auth();
  if (!session?.user) return { error: "Please log in again." };
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const slug = slugify(String(form.get("slug") ?? "") || name);
  if (!name) return { error: "Give your site a name." };

  const problem = await launchProblem(session.user.id, slug);
  if (problem) return { error: problem };
  const me = await getMe(session.user.id, { pk: session.user.akPk, username: session.user.username });
  if (!me) return { error: "Couldn't find your account. Try logging out and in again." };

  await startLaunch({ slug, name, uid: session.user.id, username: me.username, ownerPk: me.pk });
  redirect(`/launch/${slug}`);
}
