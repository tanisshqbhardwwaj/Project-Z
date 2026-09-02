import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "native-out");
const desktopDist = join(root, "desktop", "dist");
const androidWww = join(root, "android-www");

function run(command, env = {}) {
  execSync(command, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

const publicUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
  process.env.AUTH_URL?.trim().replace(/\/$/, "") ||
  "https://www.econsole.in";

console.log("\n=== Native static UI build ===");
console.log(`API origin: ${publicUrl}`);

run("npx prisma generate");
run("npx next build", {
  NATIVE_STATIC: "1",
  NEXT_PUBLIC_NATIVE_SHELL: "1",
  NEXT_PUBLIC_APP_URL: publicUrl,
  AUTH_URL: publicUrl,
});

if (!existsSync(outDir)) {
  console.error(`Export output missing at ${outDir}`);
  process.exit(1);
}

for (const target of [desktopDist, androidWww]) {
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(outDir, target, { recursive: true });
  console.log(`Copied native-out → ${target}`);
}

console.log("Native static build complete.");
