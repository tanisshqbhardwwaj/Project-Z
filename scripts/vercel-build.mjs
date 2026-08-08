import { execSync } from "node:child_process";
import { printProductionEnvErrors, validateProductionEnv } from "./validate-production-env.mjs";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

if (process.env.VERCEL) {
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

run("npx prisma generate");
run("npx next build");
