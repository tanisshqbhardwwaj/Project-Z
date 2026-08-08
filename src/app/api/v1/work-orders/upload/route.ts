import { NextResponse } from "next/server";
import { getAuthContext, handleApi, requirePermission } from "@/lib/api/context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { normalizeWorkOrderUpload } from "@/lib/media/normalize-work-order-file";
import { uploadAndExtract } from "@/services/extraction.service";
import { serializeBigInt } from "@/lib/db/prisma";

const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp", "heic", "heif"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "",
]);

function resolveMimeType(ext: string | undefined, fileType: string): string {
  if (fileType) return fileType;
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  return "image/jpeg";
}

export async function POST(request: Request) {
  return handleApi(async () => {
    enforceRateLimit(request, "work-order:upload", RATE_LIMITS.upload.limit, RATE_LIMITS.upload.windowMs);
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.create");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: { code: "NO_FILE", message: "No file uploaded" } },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExt = ext ? ALLOWED_EXTENSIONS.has(ext) : false;
    if (!validExt && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_FILE",
            message: "Invalid file type. Use PDF, JPG, PNG, WEBP, or iPhone HEIC photos.",
          },
        },
        { status: 400 }
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "Max file size is 20MB" } },
        { status: 400 }
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const normalized = await normalizeWorkOrderUpload({
      buffer: rawBuffer,
      fileName: file.name,
      mimeType: resolveMimeType(ext, file.type),
    });

    const result = await uploadAndExtract({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      file: normalized.buffer,
      fileName: normalized.fileName,
      mimeType: normalized.mimeType,
    });

    return NextResponse.json({ data: serializeBigInt(result) }, { status: 201 });
  });
}
