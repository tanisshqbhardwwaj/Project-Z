/**
 * NSIS installer bitmaps (header + sidebar) from BusinessOS mark.
 * BMP format required by NSIS/Tauri — encoded manually (sharp has no BMP output).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const markLight = join(root, "public", "brand", "businessos-mark-light.png");
const outDir = join(root, "desktop", "src-tauri", "nsis");

function encodeBmp24(rgbRows, width, height) {
  const rowStride = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowStride * height;
  const fileSize = 54 + pixelDataSize;
  const buffer = Buffer.alloc(fileSize);

  buffer.write("BM", 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(54, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(pixelDataSize, 34);

  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    const row = rgbRows[y];
    for (let x = 0; x < width; x++) {
      const i = x * 3;
      buffer[offset++] = row[i + 2];
      buffer[offset++] = row[i + 1];
      buffer[offset++] = row[i];
    }
    const padding = rowStride - width * 3;
    for (let p = 0; p < padding; p++) buffer[offset++] = 0;
  }

  return buffer;
}

async function renderCanvas(width, height, bg, markScale = 0.55) {
  if (!existsSync(markLight)) {
    throw new Error("Missing public/brand/businessos-mark-light.png");
  }
  const meta = await sharp(markLight).metadata();
  const inner = Math.round(Math.min(width, height) * markScale);
  const w = meta.width ?? inner;
  const h = meta.height ?? inner;
  const scale = Math.min(inner / w, inner / h);
  const rw = Math.round(w * scale);
  const rh = Math.round(h * scale);
  const left = Math.round((width - rw) / 2);
  const top = Math.round((height - rh) / 2);
  const mark = await sharp(markLight).resize(rw, rh).png().toBuffer();

  const { data } = await sharp({
    create: { width, height, channels: 3, background: bg },
  })
    .composite([{ input: mark, left, top }])
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(data.subarray(y * width * 3, (y + 1) * width * 3));
  }
  return rows;
}

async function writeBmp(outputPath, width, height, bg) {
  const rows = await renderCanvas(width, height, bg);
  writeFileSync(outputPath, encodeBmp24(rows, width, height));
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  await writeBmp(join(outDir, "header.bmp"), 150, 57, { r: 15, g: 23, b: 42 });
  await writeBmp(join(outDir, "sidebar.bmp"), 164, 314, { r: 37, g: 99, b: 235 });
  console.log("NSIS bitmaps written to desktop/src-tauri/nsis/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
