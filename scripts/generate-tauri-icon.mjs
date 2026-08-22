import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "desktop", "src-tauri", "icons");
mkdirSync(dir, { recursive: true });

const w = 16, h = 16;
const header = Buffer.alloc(40);
header.writeUInt32LE(40, 0);
header.writeInt32LE(w, 4);
header.writeInt32LE(h * 2, 8); // XOR + AND
header.writeUInt16LE(1, 12);
header.writeUInt16LE(32, 14);

const xor = Buffer.alloc(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    xor[i] = 0x88; xor[i + 1] = 0x94; xor[i + 2] = 0x0d; xor[i + 3] = 0xff;
  }
}
const andMask = Buffer.alloc(((w + 31) >> 5) * 4 * h, 0);
const image = Buffer.concat([header, xor, andMask]);
const imageSize = image.length;

const dirHeader = Buffer.from([0,0,1,0,1,0]);
const entry = Buffer.alloc(16);
entry[0] = w; entry[1] = h; entry[4] = 1; entry[6] = 32;
entry.writeUInt32LE(imageSize, 8);
entry.writeUInt32LE(22, 12);

writeFileSync(join(dir, "icon.ico"), Buffer.concat([dirHeader, entry, image]));
console.log("icon.ico", imageSize + 22, "bytes");
