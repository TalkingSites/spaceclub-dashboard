import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js keeps local secrets in .env.local; production gets DATABASE_URL from Coolify
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
