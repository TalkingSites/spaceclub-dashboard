// Moves the sites that were in sites.config.json into the database. Safe to re-run.
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/lib/db");

  await db.site.upsert({
  where: { id: "linux-victoria" },
  update: {},
  create: {
    id: "linux-victoria",
    name: "Linux Victoria",
    status: "LIVE",
    url: "https://linuxvictoria-decap.talkingsites.org",
    repo: "TalkingSites/linux-victoria-website-decap",
    coolifyUuid: "jq2wu50pt7nw7hbvwuqnfk1c",
    matomoInstance: "talkingsites",
    matomoSiteId: 2,
    authentikApp: "spacedash-linux-victoria",
    createdBy: "5e952ecb5064fbd0c9df5824772c5a5df7c39bc85eaa8b9a8ae6d65954a7db68",
    members: {
      create: { uid: "5e952ecb5064fbd0c9df5824772c5a5df7c39bc85eaa8b9a8ae6d65954a7db68", username: "Sophie Allen", role: "OWNER" },
    },
  },
  });
  console.log("seeded:", await db.site.count(), "site(s)");
  await db.$disconnect();
}

main();
