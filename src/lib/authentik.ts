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
