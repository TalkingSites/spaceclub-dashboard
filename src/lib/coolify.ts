// Coolify API calls: site status, plus creating and deleting a site's app. The token stays on the server.

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

async function coolify<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.COOLIFY_API_URL}/api/v1${path}`, {
    ...init,
    signal: AbortSignal.timeout(init?.method ? 30000 : 8000),
    headers: { Authorization: `Bearer ${process.env.COOLIFY_API_TOKEN}`, "Content-Type": "application/json" },
    ...(init?.method ? { cache: "no-store" as const } : { next: { revalidate: 60 } }),
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

// --- launching a site ------------------------------------------------------------

// Creates the site's Coolify app from its repo (Dockerfile build, port 3000), sets its
// env values, turns on PR previews at pr<number>-<host>, and starts the first deploy.
export async function createSiteApp(opts: { name: string; repo: string; host: string; env: Record<string, string> }) {
  const app = await coolify<{ uuid: string }>("/applications/private-github-app", {
    method: "POST",
    body: JSON.stringify({
      project_uuid: process.env.COOLIFY_PROJECT_UUID,
      server_uuid: process.env.COOLIFY_SERVER_UUID,
      environment_name: "production",
      github_app_uuid: process.env.COOLIFY_GITHUB_APP_UUID,
      git_repository: opts.repo,
      git_branch: "main",
      build_pack: "dockerfile",
      ports_exposes: "3000",
      name: opts.name,
      domains: `https://${opts.host}`,
      instant_deploy: false,
    }),
  });
  await coolify(`/applications/${app.uuid}/envs/bulk`, {
    method: "PATCH",
    body: JSON.stringify({ data: Object.entries(opts.env).map(([key, value]) => ({ key, value, is_literal: true })) }),
  });
  await coolify(`/applications/${app.uuid}`, {
    method: "PATCH",
    body: JSON.stringify({ is_preview_deployments_enabled: true, preview_url_template: "pr{{pr_id}}-{{domain}}" }),
  });
  const deploy = await coolify<{ deployments: { deployment_uuid: string }[] }>(`/deploy?uuid=${app.uuid}`, { method: "POST" });
  return { uuid: app.uuid, deploymentUuid: deploy.deployments[0]?.deployment_uuid };
}

// The app built from this repo, if there is one (a launch that failed halfway may have made it)
export async function findAppByRepo(repo: string) {
  const apps = await coolify<CoolifyApp[]>("/applications", { method: "GET" });
  return apps.find((a) => a.git_repository === repo) ?? null;
}

// Deletes the app, its PR previews and its containers. An app that's already gone is fine.
export async function deleteApp(uuid: string) {
  try {
    await coolify(`/applications/${uuid}?delete_configurations=true&delete_volumes=true&docker_cleanup=true&delete_connected_networks=true`, { method: "DELETE" });
  } catch (err) {
    if (!(err as Error).message.includes(" 404")) throw err;
  }
}

export async function redeploy(appUuid: string) {
  const deploy = await coolify<{ deployments: { deployment_uuid: string }[] }>(`/deploy?uuid=${appUuid}`, { method: "POST" });
  return deploy.deployments[0]?.deployment_uuid;
}

export async function deploymentStatus(uuid: string) {
  const d = await coolify<{ status: string }>(`/deployments/${uuid}`, { method: "GET" });
  return d.status;
}
