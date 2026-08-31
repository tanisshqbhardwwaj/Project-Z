import { execSync } from "node:child_process";

import { existsSync, unlinkSync } from "node:fs";

import { dirname, join } from "node:path";

import { fileURLToPath } from "node:url";

import sharp from "sharp";



const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const brandLight = join(root, "public", "brand", "businessos-mark-light.png");

const brandDark = join(root, "public", "brand", "businessos-mark-dark.png");

const brandPng = join(root, "public", "brand", "businessos-mark.png");

const brandSvg = join(root, "public", "brand-mark.svg");

const desktopDir = join(root, "desktop");

const iconsDir = join(desktopDir, "src-tauri", "icons");

const squareTmp = join(root, "public", "brand", ".tmp-square-mark.png");



const source = existsSync(brandLight)

  ? brandLight

  : existsSync(brandPng)

    ? brandPng

    : brandSvg;



if (!existsSync(source)) {

  console.error(

    "Missing brand source. Add public/brand/businessos-mark-light.png or public/brand/businessos-mark.png"

  );

  process.exit(1);

}



/** Tauri requires a square PNG — pad the mark on a white tile. */

async function toSquareIcon(inputPath, outputPath, size = 1024) {

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

    create: {

      width: size,

      height: size,

      channels: 4,

      background: { r: 255, g: 255, b: 255, alpha: 1 },

    },

  })

    .composite([{ input: mark, left, top }])

    .png()

    .toFile(outputPath);

}



await toSquareIcon(source, squareTmp);



try {

  execSync(`npx tauri icon "${squareTmp}" -o "src-tauri/icons"`, {

    cwd: desktopDir,

    stdio: "inherit",

  });

  console.log(`Tauri icons generated from ${source}`);

  console.log("Output:", iconsDir);

} finally {

  if (existsSync(squareTmp)) unlinkSync(squareTmp);

}



if (existsSync(brandDark)) {

  console.log("Dark mark found at public/brand/businessos-mark-dark.png — use for themed Android assets if needed.");

}

