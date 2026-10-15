// Launching a new site: the checks, and the pipeline that runs after the form is sent.
// Each step's state is saved on the site's Launch row, which the progress page polls.
import { db } from "./db";
import { addMatomoSite } from "./matomo";
import { createRepoFromTemplate, repoExists, updateJsonFile } from "./github";
import { createSpacedashApp } from "./authentik";
import { createSiteApp, deploymentStatus, redeploy } from "./coolify";

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
  void runLaunch(opts).catch((err) => console.error(`[launch] ${opts.slug}: ${(err as Error).message}`));
}

async function runLaunch(opts: { slug: string; name: string; ownerPk: number }) {
  const { slug, name } = opts;
  const host = `${slug}.${SITES_DOMAIN}`;
  const url = `https://${host}`;
  let current: StepKey = "repo";

  const set = async (key: StepKey, state: Step["state"], detail?: string) => {
    current = key;
    const launch = await db.launch.findUniqueOrThrow({ where: { siteId: slug } });
    const steps = (launch.steps as Step[]).map((s) => (s.key === key ? { ...s, state, detail } : s));
    await db.launch.update({ where: { siteId: slug }, data: { steps } });
  };

  try {
    await set("repo", "running");
    const repo = await createRepoFromTemplate(slug, `${name}: a SpaceClub site`);
    await db.site.update({ where: { id: slug }, data: { repo } });
    await set("repo", "done", repo);

    await set("analytics", "running");
    const matomo = await addMatomoSite("talkingsites", name, url);
    await db.site.update({ where: { id: slug }, data: { matomoInstance: "talkingsites", matomoSiteId: matomo.siteId } });
    await set("analytics", "done");

    await set("settings", "running");
    await updateJsonFile(repo, "src/_data/site.json", `Sets up ${name} on SpaceClub`, (site) => {
      site.title = name;
      site.url = url;
      site.matomo = { url: matomo.url, siteId: matomo.siteId };
    });
    await set("settings", "done");

    await set("login", "running");
    const login = await createSpacedashApp({ slug, name, host, ownerPk: opts.ownerPk });
    await db.site.update({ where: { id: slug }, data: { authentikApp: login.appSlug } });
    await set("login", "done");

    await set("server", "running");
    const app = await createSiteApp({
      name: slug,
      repo,
      host,
      env: {
        OIDC_ISSUER: login.issuer,
        OIDC_CLIENT_ID: login.clientId,
        OIDC_CLIENT_SECRET: login.clientSecret,
        GITHUB_APP_ID: process.env.GITHUB_APP_ID ?? "",
        GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY ?? "",
        GITHUB_INSTALLATION_ID: process.env.GITHUB_INSTALLATION_ID ?? "",
        GITHUB_REPO: repo,
      },
    });
    await db.site.update({ where: { id: slug }, data: { coolifyUuid: app.uuid } });
    await set("server", "done");

    await set("liftoff", "running", "This usually takes 2 to 4 minutes");
    let deployment = app.deploymentUuid;
    let retried = false;
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 10000));
      const status = deployment ? await deploymentStatus(deployment).catch(() => "unknown") : "unknown";
      if (status === "failed" || status.startsWith("cancelled")) {
        // a first build can fail on a network hiccup (e.g. pulling the base image), so try once more
        if (retried) throw new Error(`the build ${status} twice`);
        retried = true;
        await set("liftoff", "running", "First build hit a snag, trying again");
        deployment = await redeploy(app.uuid);
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

export async function getLaunch(slug: string, uid: string) {
  const site = await db.site.findFirst({ where: { id: slug, members: { some: { uid } } }, include: { launch: true } });
  if (!site?.launch) return null;
  return { name: site.name, status: site.status, url: site.url, steps: site.launch.steps as Step[], error: site.launch.error };
}
