// Read-only Coolify API calls. The token stays on the server.

type CoolifyApp = {
  uuid: string;
  name: string;
  fqdn: string | null;
  status: string;
  git_repository: string | null;
  git_branch: string | null;
};

type CoolifyDeployment = {
  status: string;
  created_at: string;
};

async function coolify<T>(path: string): Promise<T> {
  const res = await fetch(`${process.env.COOLIFY_API_URL}/api/v1${path}`, {
    signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${process.env.COOLIFY_API_TOKEN}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    throw new Error(`Coolify ${path} returned ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function getApp(uuid: string) {
  const [app, deployments] = await Promise.all([
    coolify<CoolifyApp>(`/applications/${uuid}`),
    coolify<{ deployments?: CoolifyDeployment[] } | CoolifyDeployment[]>(
      `/deployments/applications/${uuid}?take=1`,
    ).catch(() => []),
  ]);
  const list = Array.isArray(deployments) ? deployments : (deployments.deployments ?? []);
  return {
    url: app.fqdn?.split(",")[0] ?? null,
    // Coolify reports e.g. "running:healthy" or "exited:unhealthy"
    state: app.status.split(":")[0],
    repo: app.git_repository,
    lastDeploy: list[0] ? { status: list[0].status, at: list[0].created_at } : null,
  };
}
