import config from "../../sites.config.json";
import { getApp } from "./coolify";
import { getVisits30d } from "./matomo";

export type Site = {
  name: string;
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

export async function getSites(userId: string): Promise<Site[]> {
  const visible = config.sites.filter((s) => canSee((s as { access?: Access }).access, userId));
  return Promise.all(
    visible.map(async (s): Promise<Site> => {
      const matomo = "matomo" in s ? (s.matomo as { instance: string; siteId: number }) : null;
      const visits = matomo ? getVisits30d(matomo.instance, matomo.siteId) : Promise.resolve(null);
      try {
        const [app, visits30d] = await Promise.all([getApp(s.coolifyUuid), visits]);
        return {
          name: s.name,
          ...app,
          visits30d,
          editUrl: app.url ? new URL(s.editPath, app.url).toString() : null,
        };
      } catch (err) {
        const e = err as Error & { cause?: { code?: string } };
        console.error(`[sites] ${s.name}: ${e.message}${e.cause?.code ? ` (${e.cause.code})` : ""}`);
        return {
          name: s.name, url: null, state: "unknown", repo: null, lastDeploy: null,
          visits30d: await visits, editUrl: null, error: (err as Error).message,
        };
      }
    }),
  );
}
