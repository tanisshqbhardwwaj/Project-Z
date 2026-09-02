/**
 * Production build for Docker / Fly.io (not Vercel).
 * Installs devDependencies in the image deps stage — Tailwind/PostCSS/TS are required here.
 */
import { execSync } from "node:child_process";

const env = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
};

function run(command) {
  execSync(command, { stdio: "inherit", env });
}

run("node scripts/generate-brand-assets.mjs");
run("npx prisma generate");
run("npx next build");
