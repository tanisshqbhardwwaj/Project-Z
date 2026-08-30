import { execSync } from "node:child_process";
import { printProductionEnvErrors, validateProductionEnv } from "./validate-production-env.mjs";

const LOCAL_PRISMA_URL = "postgresql://projectz:projectz@localhost:5433/projectz";

function run(command) {
  execSync(command, { stdio: "inherit", env: process.env });
}

function ensurePrismaCliDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL || LOCAL_PRISMA_URL;
  }
}

if (process.env.VERCEL) {
  const errors = validateProductionEnv();
  if (errors.length > 0) {
    printProductionEnvErrors(errors);
    process.exit(1);
  }

  console.log("✓ Production environment variables validated");
  run("npx prisma migrate deploy");
}

ensurePrismaCliDatabaseUrl();
run("npx prisma generate");
run("npx next build");
