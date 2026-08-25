import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brandSvg = join(root, "public", "brand-mark.svg");
const desktopDir = join(root, "desktop");
const iconsDir = join(desktopDir, "src-tauri", "icons");

if (!existsSync(brandSvg)) {
  console.error("Missing brand source:", brandSvg);
  process.exit(1);
}

execSync(`npx tauri icon "${brandSvg}" -o "src-tauri/icons"`, {
  cwd: desktopDir,
  stdio: "inherit",
});

console.log("Tauri icons generated in", iconsDir);
