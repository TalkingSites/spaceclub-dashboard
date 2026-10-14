// Authentik admin API, server side only. Used for the signed-in person's own profile.
// AUTHENTIK_API_URL is the base domain (e.g. https://auth.talkingsites.org);
// AUTHENTIK_API_TOKEN is an API token (Directory > Tokens, intent API).

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

// Looks the person up by username, then checks the uid matches the signed-in subject,
// so a stale or edited username can never reach someone else's account.
export async function getMe(sub: string, username: string | undefined): Promise<AkUser | null> {
  if (!username) return null;
  const { results } = await ak<{ results: AkUser[] }>(`/core/users/?username=${encodeURIComponent(username)}`);
  return results.find((u) => u.uid === sub) ?? null;
}

export async function updateMe(pk: number, fields: Pick<AkUser, "name" | "username" | "email">) {
  return ak<AkUser>(`/core/users/${pk}/`, { method: "PATCH", body: JSON.stringify(fields) });
}
