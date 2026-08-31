/**
 * Generates / normalizes brand assets and static web favicons.
 * - Transparent mark PNGs in public/brand/
 * - Static favicon + app icons in src/app/ (replaces broken dynamic icon.tsx)
 * - PWA sizes in public/icons/
 */
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brandDir = join(root, "public", "brand");
const appDir = join(root, "src", "app");
const publicIconsDir = join(root, "public", "icons");
const markLight = join(brandDir, "businessos-mark-light.png");

/** Pixels this close to white become transparent. */
const WHITE_THRESHOLD = 248;

async function stripNearWhiteBackground(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function jpegToLogo(inputPath, outputPath) {
  await sharp(inputPath)
    .resize({ width: 1200, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function processInPlace(filename) {
  const path = join(brandDir, filename);
  if (!existsSync(path)) {
    console.log(`  − skip (missing): ${filename}`);
    return;
  }
  const tmp = join(brandDir, `.tmp-${filename}`);
  await stripNearWhiteBackground(path, tmp);
  copyFileSync(tmp, path);
  unlinkSync(tmp);
  console.log(`  ✓ ${filename} (transparent background)`);
}

/** Square app/favicon tile with centered mark — works in all browsers. */
async function composeSquareIcon(inputPath, outputPath, size, bg = { r: 255, g: 255, b: 255, alpha: 1 }) {
  const meta = await sharp(inputPath).metadata();
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  const w = meta.width ?? inner;
  const h = meta.height ?? inner;
  const scale = Math.min(inner / w, inner / h);
  const resizedW = Math.round(w * scale);
  const resizedH = Math.round(h * scale);
  const left = Math.round((size - resizedW) / 2);
  const top = Math.round((size - resizedH) / 2);
  const mark = await sharp(inputPath).resize(resizedW, resizedH).png().toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: mark, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function writeWebIcons() {
  if (!existsSync(markLight)) {
    console.log("  − skip web icons (missing businessos-mark-light.png)");
    return;
  }

  mkdirSync(publicIconsDir, { recursive: true });

  const outputs = [
    { size: 32, path: join(appDir, "icon.png") },
    { size: 180, path: join(appDir, "apple-icon.png") },
    { size: 192, path: join(publicIconsDir, "icon-192.png") },
    { size: 512, path: join(publicIconsDir, "icon-512.png") },
    { size: 32, path: join(publicIconsDir, "favicon-32.png") },
  ];

  console.log("\nGenerating static web favicons:");
  for (const { size, path } of outputs) {
    await composeSquareIcon(markLight, path, size);
    console.log(`  ✓ ${path.replace(root, ".")}`);
  }

  // Browsers often request /favicon.ico directly
  const publicFaviconIco = join(root, "public", "favicon.ico");
  const publicApple = join(root, "public", "apple-icon.png");
  const tauriIco = join(root, "desktop", "src-tauri", "icons", "icon.ico");
  if (existsSync(tauriIco)) {
    copyFileSync(tauriIco, join(appDir, "favicon.ico"));
    copyFileSync(tauriIco, publicFaviconIco);
    console.log(`  ✓ src/app/favicon.ico + public/favicon.ico`);
  } else {
    console.log("  − favicon.ico (run npm run desktop:icons first for .ico)");
  }
  copyFileSync(join(appDir, "apple-icon.png"), publicApple);
  console.log(`  ✓ public/apple-icon.png`);
}

async function main() {
  console.log("Generating brand assets in public/brand/\n");

  for (const name of [
    "businessos-mark-light.png",
    "businessos-mark-dark.png",
    "econsole-mark-light.png",
    "econsole-mark-dark.png",
    "econsole-mark.png",
  ]) {
    await processInPlace(name);
  }

  const bosMark = join(brandDir, "businessos-mark.png");
  if (existsSync(markLight)) {
    copyFileSync(markLight, bosMark);
    console.log("  ✓ businessos-mark.png (fallback)");
  }

  const logoJpeg = join(brandDir, "buisnessOS logo.jpeg");
  const logoPng = join(brandDir, "businessos-logo.png");
  if (existsSync(logoJpeg)) {
    await jpegToLogo(logoJpeg, logoPng);
    console.log("  ✓ businessos-logo.png (from JPEG)");
  } else if (existsSync(markLight) && !existsSync(logoPng)) {
    await sharp(markLight).resize({ width: 512, withoutEnlargement: true }).png().toFile(logoPng);
    console.log("  ✓ businessos-logo.png (from mark)");
  }

  await writeWebIcons();

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
