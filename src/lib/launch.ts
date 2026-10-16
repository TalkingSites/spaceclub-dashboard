// Launching a new site: the checks, and the pipeline that runs after the form is sent.
// Each step's state is saved on the site's Launch row, which the progress page polls.
import { db } from "./db";
import { addMatomoSite, deleteMatomoSite } from "./matomo";
import { OWNER, createRepoFromTemplate, repoExists, updateJsonFile } from "./github";
import { createSpacedashApp, deleteSpacedashApp } from "./authentik";
import { createSiteApp, deleteApp, deploymentStatus, findAppByRepo, redeploy } from "./coolify";

export const SITES_DOMAIN = process.env.SITES_DOMAIN ?? "sites.talkingsites.org";
const FREE_SITES = 1;
const RESERVED = new Set(["www", "mail", "admin", "api", "auth", "mission", "app", "dashboard", "spaceclub", "talkingsites", "test"]);

export const STEPS = [
  { key: "repo", label: "Building your site from the SpaceClub template" },
  { key: "analytics", label: "Setting up visitor analytics" },
  { key: "settings", label: "Writing your site's settings" },
  { key: "login", label: "Creating your Spacedash login" },
  { key: "server", label: "Booking a spot on the server" },
  { key: "liftoff", label: "Lift-off: building and going live" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
export type Step = { key: StepKey; label: string; state: "waiting" | "running" | "done" | "failed"; detail?: string };

export function slugify(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 32).replace(/^-|-$/g, "");
}

export function isAdmin(uid: string) {
  return (process.env.SPACECLUB_ADMIN_UIDS ?? "").split(",").map((s) => s.trim()).includes(uid);
}

// What would stop this person launching a site with this address? null means go ahead.
export async function launchProblem(uid: string, slug: string): Promise<string | null> {
  if (!/^[a-z][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) return "Use 3 to 32 lowercase letters, numbers and dashes, starting with a letter.";
  if (RESERVED.has(slug) || /^pr\d+-/.test(slug)) return "That address is reserved. Please pick another.";
  if (!isAdmin(uid)) {
    const mine = await db.site.count({ where: { createdBy: uid, status: { not: "FAILED" } } });
    if (mine >= FREE_SITES) return `Each account can launch ${FREE_SITES} free site. Ask us if you need another.`;
  }
  if (await db.site.findUnique({ where: { id: slug } })) return "That address is taken. Please pick another.";
  if (await repoExists(slug)) return "That address is taken. Please pick another.";
  return null;
}

export async function startLaunch(opts: { slug: string; name: string; uid: string; username?: string; ownerPk: number }) {
  const steps: Step[] = STEPS.map((s) => ({ ...s, state: "waiting" }));
  await db.site.create({
    data: {
      id: opts.slug,
      name: opts.name,
      createdBy: opts.uid,
      url: `https://${opts.slug}.${SITES_DOMAIN}`,
      members: { create: { uid: opts.uid, username: opts.username, role: "OWNER" } },
      launch: { create: { steps } },
    },
  });
  // runs on after the form's response; progress is read from the database
  void runLaunch(opts.slug, opts.ownerPk).catch((err) => console.error(`[launch] ${opts.slug}: ${(err as Error).message}`));
}

// The site's owner and SpaceClub admins can retry or delete it
export async function canManage(slug: string, uid: string) {
  if (isAdmin(uid)) return !!(await db.site.findUnique({ where: { id: slug } }));
  return !!(await db.site.findFirst({ where: { id: slug, members: { some: { uid, role: "OWNER" } } } }));
}

export async function siteOwner(slug: string) {
  return db.siteMember.findFirst({ where: { siteId: slug, role: "OWNER" } });
}

// Starts a failed launch again from the step that failed; finished steps are kept
export async function retryLaunch(slug: string, ownerPk: number) {
  const site = await db.site.findUnique({ where: { id: slug }, include: { launch: true } });
  if (!site?.launch || site.status !== "FAILED") throw new Error("Only a launch that failed can be retried.");
  const steps = (site.launch.steps as Step[]).map((s) => (s.state === "done" ? s : { ...s, state: "waiting" as const, detail: undefined }));
  await db.launch.update({ where: { siteId: slug }, data: { steps, error: null, finishedAt: null } });
  await db.site.update({ where: { id: slug }, data: { status: "LAUNCHING" } });
  void runLaunch(slug, ownerPk).catch((err) => console.error(`[launch] ${slug}: ${(err as Error).message}`));
}

async function runLaunch(slug: string, ownerPk: number) {
  const host = `${slug}.${SITES_DOMAIN}`;
  const url = `https://${host}`;
  let current: StepKey = "repo";
  const launch = await db.launch.findUniqueOrThrow({ where: { siteId: slug } });
  const finished = new Set((launch.steps as Step[]).filter((s) => s.state === "done").map((s) => s.key));

  const set = async (key: StepKey, state: Step["state"], detail?: string) => {
    current = key;
    const launch = await db.launch.findUniqueOrThrow({ where: { siteId: slug } });
    const steps = (launch.steps as Step[]).map((s) => (s.key === key ? { ...s, state, detail } : s));
    await db.launch.update({ where: { siteId: slug }, data: { steps } });
  };
  // runs a step unless an earlier attempt already finished it
  const step = async (key: StepKey, run: () => Promise<string | void>) => {
    current = key;
    if (finished.has(key)) return;
    await set(key, "running");
    await set(key, "done", (await run()) || undefined);
  };

  try {
    let site = await db.site.findUniqueOrThrow({ where: { id: slug } });
    const name = site.name;

    await step("repo", async () => {
      const repo = (await repoExists(slug)) ? `${OWNER}/${slug}` : await createRepoFromTemplate(slug, `${name}: a SpaceClub site`);
      await db.site.update({ where: { id: slug }, data: { repo } });
      return repo;
    });
    site = await db.site.findUniqueOrThrow({ where: { id: slug } });
    const repo = site.repo!;

    await step("analytics", async () => {
      if (site.matomoSiteId) return;
      const matomo = await addMatomoSite("talkingsites", name, url);
      await db.site.update({ where: { id: slug }, data: { matomoInstance: "talkingsites", matomoSiteId: matomo.siteId } });
    });
    site = await db.site.findUniqueOrThrow({ where: { id: slug } });

    await step("settings", async () => {
      const matomoUrl = `${(process.env[`MATOMO_${site.matomoInstance!.toUpperCase()}_URL`] ?? "").replace(/\/$/, "")}/`;
      await updateJsonFile(repo, "src/_data/site.json", `Sets up ${name} on SpaceClub`, (json) => {
        json.title = name;
        json.url = url;
        json.matomo = { url: matomoUrl, siteId: site.matomoSiteId };
      });
    });

    // the sign-in's client secret isn't stored, so if a retry skips this step but the
    // server step still needs it, getLogin() reads it back from the existing Authentik app
    let login: Awaited<ReturnType<typeof createSpacedashApp>> | undefined;
    const getLogin = async () => {
      login ??= await createSpacedashApp({ slug, name, host, ownerPk });
      await db.site.update({ where: { id: slug }, data: { authentikApp: login.appSlug } });
      return login;
    };
    await step("login", async () => void (await getLogin()));

    let deployment: string | undefined;
    await step("server", async () => {
      const existing = site.coolifyUuid ?? (await findAppByRepo(repo))?.uuid;
      if (existing) {
        await db.site.update({ where: { id: slug }, data: { coolifyUuid: existing } });
        return;
      }
      const { issuer, clientId, clientSecret } = await getLogin();
      const app = await createSiteApp({
        name: slug,
        repo,
        host,
        env: {
          OIDC_ISSUER: issuer,
          OIDC_CLIENT_ID: clientId,
          OIDC_CLIENT_SECRET: clientSecret,
          GITHUB_APP_ID: process.env.GITHUB_APP_ID ?? "",
          GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY ?? "",
          GITHUB_INSTALLATION_ID: process.env.GITHUB_INSTALLATION_ID ?? "",
          GITHUB_REPO: repo,
        },
      });
      await db.site.update({ where: { id: slug }, data: { coolifyUuid: app.uuid } });
      deployment = app.deploymentUuid;
    });
    site = await db.site.findUniqueOrThrow({ where: { id: slug } });
    const appUuid = site.coolifyUuid!;

    // lift-off always runs (finished launches never get here), deploying again on a retry
    current = "liftoff";
    await set("liftoff", "running", "This usually takes 2 to 4 minutes");
    deployment ??= await redeploy(appUuid);
    let retried = false;
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 10000));
      const status = deployment ? await deploymentStatus(deployment).catch(() => "unknown") : "unknown";
      if (status === "failed" || status.startsWith("cancelled")) {
        // a first build can fail on a network hiccup (e.g. pulling the base image), so try once more
        if (retried) throw new Error(`the build ${status} twice`);
        retried = true;
        await set("liftoff", "running", "First build hit a snag, trying again");
        deployment = await redeploy(appUuid);
        continue;
      }
      if (status === "finished") {
        const live = await fetch(url, { signal: AbortSignal.timeout(10000) }).then((r) => r.ok).catch(() => false);
        if (live) {
          await set("liftoff", "done");
          await db.site.update({ where: { id: slug }, data: { status: "LIVE" } });
          await db.launch.update({ where: { siteId: slug }, data: { finishedAt: new Date() } });
          return;
        }
      }
    }
    throw new Error("the site didn't come online within 15 minutes");
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[launch] ${slug} failed at ${current}: ${message}`);
    await set(current, "failed", message).catch(() => {});
    await db.site.update({ where: { id: slug }, data: { status: "FAILED" } }).catch(() => {});
    await db.launch.update({ where: { siteId: slug }, data: { error: message, finishedAt: new Date() } }).catch(() => {});
  }
}

// Deletes everything a launch made except the GitHub repo, which always stays: the
// Coolify app (and its previews), the Spacedash sign-in, the analytics site, then the
// record. If any part fails the record is kept, so it can be tried again.
export async function deleteSite(slug: string) {
  const site = await db.site.findUniqueOrThrow({ where: { id: slug } });
  if (site.status === "LAUNCHING") throw new Error("Wait for the launch to finish or fail first.");
  const coolifyUuid = site.coolifyUuid ?? (site.repo ? (await findAppByRepo(site.repo))?.uuid : undefined);
  if (coolifyUuid) await deleteApp(coolifyUuid);
  await deleteSpacedashApp(site.authentikApp ?? `spacedash-${slug}`);
  if (site.matomoInstance && site.matomoSiteId) await deleteMatomoSite({ instance: site.matomoInstance, siteId: site.matomoSiteId });
  await db.site.delete({ where: { id: slug } });
}

export async function getLaunch(slug: string, uid: string) {
  const site = await db.site.findFirst({ where: { id: slug, members: { some: { uid } } }, include: { launch: true } });
  if (!site?.launch) return null;
  return { name: site.name, status: site.status, url: site.url, steps: site.launch.steps as Step[], error: site.launch.error };
}
