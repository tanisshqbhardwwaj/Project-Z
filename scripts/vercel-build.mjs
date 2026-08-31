import { execSync } from "node:child_process";
import { applyVercelProductionDefaults, printProductionEnvErrors, validateProductionEnv } from "./validate-production-env.mjs";

const LOCAL_PRISMA_URL = "file:./dev.db";

function run(command) {
  execSync(command, { stdio: "inherit", env: process.env });
}

function ensurePrismaCliDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = LOCAL_PRISMA_URL;
  }
}

if (process.env.VERCEL) {
  if (applyVercelProductionDefaults()) {
    console.log(
      "ℹ Using default production URLs (https://www.econsole.in) — set AUTH_URL and NEXT_PUBLIC_APP_URL in Vercel to override."
    );
  }
  const errors = validateProductionEnv();
  if (errors.length > 0) {
    printProductionEnvErrors(errors);
    process.exit(1);
  }

  console.log("✓ Production environment variables validated");

  if (process.env.TURSO_DATABASE_URL) {
    run("node scripts/turso-migrate.mjs");
  } else {
    run("npx prisma migrate deploy");
  }
}

ensurePrismaCliDatabaseUrl();
run("node scripts/generate-brand-assets.mjs");
run("npx prisma generate");
run("npx next build");
