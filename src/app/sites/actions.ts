"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMe } from "@/lib/authentik";
import { db } from "@/lib/db";
import { canManage, deleteSite, retryLaunch, siteOwner } from "@/lib/launch";

export type SiteActionState = { error?: string };

// Picks a failed launch up from the step that failed
export async function retry(_prev: SiteActionState, form: FormData): Promise<SiteActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Please log in again." };
  const slug = String(form.get("slug") ?? "");
  if (!(await canManage(slug, session.user.id))) return { error: "Only the site's owner can retry its launch." };

  try {
    // the Spacedash sign-in is given to the site's owner, who may not be the person retrying
    const owner = await siteOwner(slug);
    const mine = owner?.uid === session.user.id;
    const ownerAccount = owner && (mine
      ? await getMe(owner.uid, { pk: session.user.akPk, username: session.user.username })
      : await getMe(owner.uid, { username: owner.username ?? undefined }));
    if (!ownerAccount) return { error: "Couldn't find the site owner's account." };
    await retryLaunch(slug, ownerAccount.pk);
  } catch (err) {
    console.error(`[launch] retry ${slug}: ${(err as Error).message}`);
    return { error: (err as Error).message };
  }
  redirect(`/launch/${slug}`);
}

// Deletes a site, keeping its GitHub repo. The person types the site's name to confirm.
export async function remove(_prev: SiteActionState, form: FormData): Promise<SiteActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Please log in again." };
  const slug = String(form.get("slug") ?? "");
  if (!(await canManage(slug, session.user.id))) return { error: "Only the site's owner can delete it." };
  const site = await db.site.findUnique({ where: { id: slug } });
  if (!site) return { error: "That site is already gone." };
  if (String(form.get("confirm") ?? "").trim() !== site.name) return { error: `Type ${site.name} to confirm.` };

  try {
    await deleteSite(slug);
  } catch (err) {
    console.error(`[sites] delete ${slug}: ${(err as Error).message}`);
    return { error: `Couldn't delete everything: ${(err as Error).message}` };
  }
  revalidatePath("/");
  redirect("/");
}
