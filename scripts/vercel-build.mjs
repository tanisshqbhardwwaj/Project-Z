import { execSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL ?? "";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

if (process.env.VERCEL) {
  if (!databaseUrl) {
    console.error("\nBuild failed: DATABASE_URL is missing on Vercel.");
    console.error("Add your Neon Postgres connection string in Vercel → Settings → Environment Variables.\n");
    process.exit(1);
  }

  if (databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")) {
    console.error("\nBuild failed: DATABASE_URL points to localhost.");
    console.error("Vercel cannot reach your local Docker Postgres.");
    console.error("Use a cloud database URL from Neon instead, for example:");
    console.error("postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require\n");
    process.exit(1);
  }

  run("npx prisma migrate deploy");
}

run("npx prisma generate");
run("npx next build");
