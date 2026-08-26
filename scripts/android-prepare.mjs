import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brandIcons = join(root, "desktop", "src-tauri", "icons", "android");
const resDir = join(root, "android", "app", "src", "main", "res");

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const from = join(src, entry);
    const to = join(dest, entry);
    if (statSync(from).isDirectory()) copyDir(from, to);
    else cpSync(from, to);
  }
}

if (!existsSync(brandIcons)) {
  console.error("Missing brand icons. Run: npm run desktop:icons");
  process.exit(1);
}

for (const entry of readdirSync(brandIcons)) {
  const src = join(brandIcons, entry);
  if (entry === "values") {
    copyDir(src, join(resDir, "values"));
    continue;
  }
  if (entry.startsWith("mipmap-")) {
    copyDir(src, join(resDir, entry));
  }
}

console.log("Android launcher icons copied from Project Z brand mark.");
