import config from "../../sites.config.json";
import { getApp } from "./coolify";
import { getVisits30d, type MatomoRef } from "./matomo";

export type Site = {
  id: string;
  name: string;
  hasAnalytics: boolean;
  url: string | null;
  state: string;
  repo: string | null;
  lastDeploy: { status: string; at: string } | null;
  visits30d: number | null;
  editUrl: string | null;
  error?: string;
};

// Who can see a site: Authentik user ids (the OIDC "sub", which is the user's uid
// because the provider uses hashed user ids). The username is only a reminder.
type Access = { users?: { uid: string; username?: string }[] };

function canSee(access: Access | undefined, userId: string) {
  return access?.users?.some((u) => u.uid === userId) ?? false;
}

type ConfigSite = (typeof config.sites)[number];

function matomoOf(s: ConfigSite): MatomoRef | null {
  return "matomo" in s ? (s.matomo as MatomoRef) : null;
}

// One site, only if this person can see it
export function findSite(id: string, userId: string) {
  const s = config.sites.find((x) => x.id === id);
  if (!s || !canSee((s as { access?: Access }).access, userId)) return null;
  return { id: s.id, name: s.name, matomo: matomoOf(s) };
}

export async function getSites(userId: string): Promise<Site[]> {
  const visible = config.sites.filter((s) => canSee((s as { access?: Access }).access, userId));
  return Promise.all(
    visible.map(async (s): Promise<Site> => {
      const matomo = matomoOf(s);
      const visits = matomo ? getVisits30d(matomo) : Promise.resolve(null);
      try {
        const [app, visits30d] = await Promise.all([getApp(s.coolifyUuid), visits]);
        return {
          id: s.id,
          name: s.name,
          hasAnalytics: !!matomo,
          ...app,
          visits30d,
          editUrl: app.url ? new URL(s.editPath, app.url).toString() : null,
        };
      } catch (err) {
        const e = err as Error & { cause?: { code?: string } };
        console.error(`[sites] ${s.name}: ${e.message}${e.cause?.code ? ` (${e.cause.code})` : ""}`);
        return {
          id: s.id, name: s.name, hasAnalytics: !!matomo, url: null, state: "unknown", repo: null, lastDeploy: null,
          visits30d: await visits, editUrl: null, error: (err as Error).message,
        };
      }
    }),
  );
}
