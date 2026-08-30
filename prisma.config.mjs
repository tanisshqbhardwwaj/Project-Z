import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prefer DIRECT_URL for migrate (non-pooled). Runtime Prisma Client still uses DATABASE_URL.
// Local Docker default matches docker-compose.yml — not a production secret.
const databaseUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://projectz:projectz@localhost:5433/projectz";

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
