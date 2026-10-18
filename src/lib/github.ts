// GitHub, as the "spaceclub-spacedash" GitHub App. Used by the launch pipeline to create
// a site's repo from the template and write its settings. Server side only.
import crypto from "node:crypto";

export const OWNER = "TalkingSites";
export const TEMPLATE_REPO = "spaceclub-template";
// TalkingSites' repo topics: every repo has one kind (website, tool, template, docs, one-off);
// websites also say how they were made (mission-control or handmade)
const LAUNCH_TOPICS = ["website", "mission-control", "spaceclub"];

function appJwt() {
  const key = (process.env.GITHUB_APP_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iat: now - 60, exp: now + 540, iss: process.env.GITHUB_APP_ID })}`;
  return `${body}.${crypto.sign("RSA-SHA256", Buffer.from(body), key).toString("base64url")}`;
}

// An installation token. Pass repositories to limit it to those repos.
async function installationToken(repositories?: string[]) {
  const res = await fetch(`https://api.github.com/app/installations/${process.env.GITHUB_INSTALLATION_ID}/access_tokens`, {
    method: "POST",
    headers: { Authorization: `Bearer ${appJwt()}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify(repositories ? { repositories } : {}),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`GitHub App token: ${res.status} ${data.message ?? ""}`);
  return data.token as string;
}

async function gh<T>(token: string, path: string, init?: RequestInit): Promise<{ status: number; data: T }> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json", ...init?.headers },
    signal: AbortSignal.timeout(20000),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data: data as T };
}

export async function repoExists(name: string) {
  const token = await installationToken();
  return (await gh(token, `/repos/${OWNER}/${name}`)).status === 200;
}

// Creates OWNER/name from the template and waits until its files are there
export async function createRepoFromTemplate(name: string, description: string) {
  const token = await installationToken();
  const { status, data } = await gh<{ full_name?: string; message?: string }>(token, `/repos/${OWNER}/${TEMPLATE_REPO}/generate`, {
    method: "POST",
    body: JSON.stringify({ owner: OWNER, name, description, private: false }),
  });
  if (status !== 201) throw new Error(`creating the repo: ${status} ${data?.message ?? ""}`);
  // tagged so TalkingSites' repo list shows it's a website launched from Mission Control
  // (GitHub doesn't copy topics from the template)
  await gh(token, `/repos/${OWNER}/${name}/topics`, { method: "PUT", body: JSON.stringify({ names: LAUNCH_TOPICS }) }).catch(() => {});
  for (let i = 0; i < 30; i++) {
    if ((await gh(token, `/repos/${OWNER}/${name}/contents/src/_data/site.json`)).status === 200) return `${OWNER}/${name}`;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("the new repo's files didn't appear in time");
}

// Reads a JSON file in the repo, lets `change` edit it, and commits it back
export async function updateJsonFile(repo: string, path: string, message: string, change: (json: Record<string, unknown>) => void) {
  const token = await installationToken([repo.split("/")[1]]);
  const { status, data } = await gh<{ content: string; sha: string }>(token, `/repos/${repo}/contents/${path}`);
  if (status !== 200) throw new Error(`reading ${path}: ${status}`);
  const json = JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
  change(json);
  const put = await gh<{ message?: string }>(token, `/repos/${repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message, sha: data.sha, content: Buffer.from(JSON.stringify(json, null, 2) + "\n").toString("base64") }),
  });
  if (put.status !== 200) throw new Error(`writing ${path}: ${put.status} ${put.data?.message ?? ""}`);
}

// Keeps a deleted site's repo as a backup: renamed to <name>-deleted-<date> (then -2, -3...
// if that's taken) so the address can be used again, and archived so it's read-only.
// Returns the new owner/name, or null if the repo is already gone. Needs the app's
// Administration (write) permission.
export async function archiveDeletedRepo(repo: string) {
  const [owner, name] = repo.split("/");
  const token = await installationToken();
  const base = `${name}-deleted-${new Date().toISOString().slice(0, 10)}`;
  let next = base;
  for (let n = 2; (await gh(token, `/repos/${owner}/${next}`)).status === 200; n++) next = `${base}-${n}`;
  const { status, data } = await gh<{ full_name?: string; message?: string }>(token, `/repos/${owner}/${name}`, {
    method: "PATCH",
    body: JSON.stringify({ name: next, archived: true }),
  });
  if (status === 404) return null;
  if (status !== 200) throw new Error(`archiving the repo: ${status} ${data?.message ?? ""}`);
  return data?.full_name ?? `${owner}/${next}`;
}

// Deletes a site's repo for good (when someone unticks "Keep a backup")
export async function deleteRepo(repo: string) {
  const token = await installationToken();
  const { status, data } = await gh<{ message?: string }>(token, `/repos/${repo}`, { method: "DELETE" });
  if (status !== 204 && status !== 404) throw new Error(`deleting the repo: ${status} ${data?.message ?? ""}`);
}
