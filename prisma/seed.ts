// Loads exported sites into this database: from SEED_SITES (base64 JSON, set in Coolify)
// or the gitignored prisma/seed-data.json locally. They hold people's names and ids, so
// they never go in the repo. Run it by hand (npm run db:seed) when setting up a new copy; it
// only adds sites that aren't there yet. (It used to run on every start, which brought
// deleted sites back.)
import { existsSync, readFileSync } from "node:fs";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

type Row = {
  id: string; name: string; status: "LAUNCHING" | "LIVE" | "FAILED"; url: string | null; repo: string | null;
  coolifyUuid: string | null; editPath: string; matomoInstance: string | null; matomoSiteId: number | null;
  authentikApp: string | null; createdBy: string; createdAt: string;
  members: { uid: string; username: string | null; role: "OWNER" | "EDITOR" }[];
  launch: { steps: object; error: string | null; startedAt: string; finishedAt: string | null } | null;
};

async function main() {
  const { db } = await import("../src/lib/db");
  const file = new URL("./seed-data.json", import.meta.url);
  const raw = process.env.SEED_SITES ? Buffer.from(process.env.SEED_SITES, "base64").toString("utf8") : existsSync(file) ? readFileSync(file, "utf8") : "[]";
  const rows: Row[] = JSON.parse(raw);
  let added = 0;
  for (const { members, launch, ...site } of rows) {
    if (await db.site.findUnique({ where: { id: site.id } })) continue;
    await db.site.create({
      data: {
        ...site,
        members: { create: members.map(({ uid, username, role }) => ({ uid, username, role })) },
        ...(launch ? { launch: { create: { steps: launch.steps, error: launch.error, startedAt: launch.startedAt, finishedAt: launch.finishedAt } } } : {}),
      },
    });
    added++;
  }
  console.log(`seed: ${added} added, ${rows.length - added} already there`);
  await db.$disconnect();
}

main();
