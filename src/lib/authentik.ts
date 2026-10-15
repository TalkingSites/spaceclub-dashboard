// Authentik admin API, server side only. Used for the signed-in person's own profile.
// AUTHENTIK_API_URL is the base domain (e.g. https://auth.talkingsites.org);
// AUTHENTIK_API_TOKEN belongs to the spaceclub-mission-control service account, whose
// role only allows viewing and changing users (no brands, flows, providers or roles).

type AkUser = { pk: number; uid: string; username: string; name: string; email: string };

async function ak<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.AUTHENTIK_API_URL}/api/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.AUTHENTIK_API_TOKEN}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Authentik ${path} returned ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Finds the signed-in person. The Authentik pk is remembered at login, so a later
// username change can't break the lookup; the username is only a fallback for sessions
// from before that. Either way the uid must match the signed-in subject, so this can
// never return someone else's account.
export async function getMe(sub: string, ref: { pk?: number; username?: string }): Promise<AkUser | null> {
  if (ref.pk) {
    const user = await ak<AkUser>(`/core/users/${ref.pk}/`);
    return user.uid === sub ? user : null;
  }
  if (!ref.username) return null;
  const { results } = await ak<{ results: AkUser[] }>(`/core/users/?username=${encodeURIComponent(ref.username)}`);
  return results.find((u) => u.uid === sub) ?? null;
}

export async function updateMe(pk: number, fields: Pick<AkUser, "name" | "username" | "email">) {
  return ak<AkUser>(`/core/users/${pk}/`, { method: "PATCH", body: JSON.stringify(fields) });
}

// --- launching a site ------------------------------------------------------------
// Creates the site's "Spacedash: <name>" sign-in (provider + app) and gives the owner
// access. Needs the role's add/view provider, application and binding permissions.
// The flows and claim mappings are the same ones Mission Control's own provider uses.
export async function createSpacedashApp(opts: { slug: string; name: string; host: string; ownerPk: number }) {
  const env = process.env;
  const escaped = opts.host.replace(/\./g, "\\.");
  const provider = await ak<{ pk: number; client_id: string; client_secret: string }>("/providers/oauth2/", {
    method: "POST",
    body: JSON.stringify({
      name: `Provider for Spacedash: ${opts.name}`,
      authorization_flow: env.AUTHENTIK_AUTHORIZATION_FLOW,
      invalidation_flow: env.AUTHENTIK_INVALIDATION_FLOW,
      property_mappings: (env.AUTHENTIK_SCOPE_MAPPINGS ?? "").split(",").filter(Boolean),
      client_type: "confidential",
      sub_mode: "hashed_user_id",
      include_claims_in_id_token: true,
      issuer_mode: "per_provider",
      redirect_uris: [
        { matching_mode: "strict", url: `https://${opts.host}/api/callback` },
        // PR previews live at pr<number>-<host>
        { matching_mode: "regex", url: `^https://pr[0-9]+-${escaped}/api/callback$` },
      ],
    }),
  });
  const appSlug = `spacedash-${opts.slug}`;
  const app = await ak<{ pk: string }>("/core/applications/", {
    method: "POST",
    body: JSON.stringify({
      name: `Spacedash: ${opts.name}`,
      slug: appSlug,
      provider: provider.pk,
      meta_launch_url: `https://${opts.host}/admin/`,
      meta_description: `Edit the ${opts.name} site`,
    }),
  });
  await ak("/policies/bindings/", { method: "POST", body: JSON.stringify({ target: app.pk, user: opts.ownerPk, order: 0, enabled: true }) });
  return {
    appSlug,
    issuer: `${env.AUTHENTIK_API_URL}/application/o/${appSlug}/`,
    clientId: provider.client_id,
    clientSecret: provider.client_secret,
  };
}
