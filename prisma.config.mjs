import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { defineConfig } from "prisma/config";

const require = createRequire(import.meta.url);
if (existsSync(".env")) {
  try {
    require("dotenv/config");
  } catch {
    /* dotenv is dev-only locally; production uses Fly/Vercel env vars */
  }
}

// Prisma CLI (generate, migrate dev) needs a datasource URL even when production
// runtime uses Turso via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
