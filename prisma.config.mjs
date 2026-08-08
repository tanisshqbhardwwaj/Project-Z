import "dotenv/config";
import { defineConfig } from "prisma/config";

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
