import { db } from "./db";
import { isAdmin } from "./launch";
import { getApp } from "./coolify";
import { getVisits30d, type MatomoRef } from "./matomo";

export type Site = {
  id: string;
  name: string;
  status: "LAUNCHING" | "LIVE" | "FAILED";
  hasAnalytics: boolean;
  url: string | null;
  state: string;
  repo: string | null;
  lastDeploy: { status: string; at: string } | null;
  visits30d: number | null;
  editUrl: string | null;
  canManage: boolean; // the owner or an admin: can open its settings, retry a failed launch, delete it
  error?: string;
};

type Row = Awaited<ReturnType<typeof db.site.findFirst>> & {};

function matomoOf(s: Row): MatomoRef | null {
  return s.matomoInstance && s.matomoSiteId ? { instance: s.matomoInstance, siteId: s.matomoSiteId } : null;
}

// One site, only if this person is a member of it
export async function findSite(id: string, userId: string) {
  const s = await db.site.findFirst({ where: { id, members: { some: { uid: userId } } } });
  if (!s) return null;
  return { id: s.id, name: s.name, matomo: matomoOf(s) };
}

// The sites this person is a member of, with live status from Coolify and visits from Matomo
export async function getSites(userId: string): Promise<Site[]> {
  const rows = await db.site.findMany({ where: { members: { some: { uid: userId } } }, include: { members: { where: { uid: userId } } }, orderBy: { createdAt: "asc" } });
  const admin = isAdmin(userId);
  return Promise.all(
    rows.map(async (s): Promise<Site> => {
      const matomo = matomoOf(s);
      const canManage = admin || s.members.some((m) => m.role === "OWNER");
      const base = { id: s.id, name: s.name, status: s.status, hasAnalytics: !!matomo, canManage };
      const visits = matomo ? getVisits30d(matomo) : Promise.resolve(null);
      if (!s.coolifyUuid) {
        return { ...base, url: s.url, state: s.status.toLowerCase(), repo: s.repo, lastDeploy: null, visits30d: await visits, editUrl: null };
      }
      try {
        const [app, visits30d] = await Promise.all([getApp(s.coolifyUuid), visits]);
        const url = app.url ?? s.url;
        return { ...base, ...app, url, repo: app.repo ?? s.repo, visits30d, editUrl: url ? new URL(s.editPath, url).toString() : null };
      } catch (err) {
        const e = err as Error & { cause?: { code?: string } };
        console.error(`[sites] ${s.name}: ${e.message}${e.cause?.code ? ` (${e.cause.code})` : ""}`);
        return { ...base, url: s.url, state: "unknown", repo: s.repo, lastDeploy: null, visits30d: await visits, editUrl: null, error: e.message };
      }
    }),
  );
}
