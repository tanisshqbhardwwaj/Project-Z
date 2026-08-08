const HEIC_EXTENSIONS = new Set(["heic", "heif"]);
const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export function isHeicFile(fileName: string, mimeType: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return HEIC_EXTENSIONS.has(ext) || HEIC_MIME_TYPES.has(mimeType.toLowerCase());
}

export async function normalizeWorkOrderUpload(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  if (!isHeicFile(input.fileName, input.mimeType)) {
    return input;
  }

  const convert = (await import("heic-convert")).default;
  const converted = await convert({
    buffer: input.buffer,
    format: "JPEG",
    quality: 0.92,
  });

  const baseName = input.fileName.replace(/\.(heic|heif)$/i, "") || "work-order-photo";

  return {
    buffer: Buffer.from(converted),
    fileName: `${baseName}.jpg`,
    mimeType: "image/jpeg",
  };
}
