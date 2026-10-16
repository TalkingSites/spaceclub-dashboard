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
  // a DELETE answers with no content
  if (res.status === 204) return undefined as T;
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
type AkProvider = { pk: number; client_id: string; client_secret: string };
type AkApp = { pk: string; slug: string; provider: number | null };

// Like ak(), but a 404 comes back as null
async function akFind<T>(path: string): Promise<T | null> {
  try {
    return await ak<T>(path);
  } catch (err) {
    if ((err as Error).message.includes(" 404")) return null;
    throw err;
  }
}

// Creates the site's "Spacedash: <name>" sign-in (provider + app) and gives the owner
// access. A launch that's being retried may have made some of these already, so each
// part is reused if it's there. Needs the role's add/view provider, application and
// binding permissions. The flows and claim mappings are the same ones Mission
// Control's own provider uses.
export async function createSpacedashApp(opts: { slug: string; name: string; host: string; ownerPk: number }) {
  const env = process.env;
  const escaped = opts.host.replace(/\./g, "\\.");
  const appSlug = `spacedash-${opts.slug}`;
  const providerName = `Provider for Spacedash: ${opts.name}`;

  let app = await akFind<AkApp>(`/core/applications/${appSlug}/`);
  let provider = app?.provider
    ? await ak<AkProvider>(`/providers/oauth2/${app.provider}/`)
    : (await ak<{ results: AkProvider[] }>(`/providers/oauth2/?name=${encodeURIComponent(providerName)}`)).results[0];
  provider ??= await ak<AkProvider>("/providers/oauth2/", {
    method: "POST",
    body: JSON.stringify({
      name: providerName,
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
  app ??= await ak<AkApp>("/core/applications/", {
    method: "POST",
    body: JSON.stringify({
      name: `Spacedash: ${opts.name}`,
      slug: appSlug,
      provider: provider.pk,
      meta_launch_url: `https://${opts.host}/admin/`,
      meta_description: `Edit the ${opts.name} site`,
    }),
  });
  const bindings = await ak<{ results: unknown[] }>(`/policies/bindings/?target=${app.pk}&user=${opts.ownerPk}`);
  if (!bindings.results.length) {
    await ak("/policies/bindings/", { method: "POST", body: JSON.stringify({ target: app.pk, user: opts.ownerPk, order: 0, enabled: true }) });
  }
  return {
    appSlug,
    issuer: `${env.AUTHENTIK_API_URL}/application/o/${appSlug}/`,
    clientId: provider.client_id,
    clientSecret: provider.client_secret,
  };
}

// Removes the site's sign-in: the app (which takes its bindings with it), then its
// provider. Needs the role's delete application and delete OAuth2 provider permissions.
export async function deleteSpacedashApp(appSlug: string) {
  const app = await akFind<AkApp>(`/core/applications/${appSlug}/`);
  if (!app) return;
  await ak(`/core/applications/${appSlug}/`, { method: "DELETE" });
  if (app.provider) await ak(`/providers/oauth2/${app.provider}/`, { method: "DELETE" });
}
