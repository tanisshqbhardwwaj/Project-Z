import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * R2 + AWS SDK v3.729+ requires disabling default checksum behavior.
 * @see https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
 */
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const BUCKET = process.env.S3_BUCKET ?? "project-z";

/** True when using cloud R2 (bucket must already exist in dashboard). */
function isCloudStorage(): boolean {
  const endpoint = process.env.S3_ENDPOINT ?? "";
  return endpoint.includes("r2.cloudflarestorage.com") || Boolean(process.env.VERCEL);
}

let bucketReady: Promise<void> | null = null;

function storageErrorName(err: unknown): string {
  return err instanceof Error ? err.name : "";
}

function cloudBucketError(err: unknown): Error {
  const name = storageErrorName(err);
  if (name === "NotFound" || name === "NoSuchBucket") {
    return new Error(
      `R2 bucket "${BUCKET}" not found. In Cloudflare Dashboard → R2 → Create bucket with this exact name, then set S3_BUCKET on Vercel to match.`
    );
  }
  if (name === "AccessDenied" || name === "Forbidden") {
    return new Error(
      `Storage access denied for bucket "${BUCKET}". Check R2 API token has Object Read & Write and S3_ENDPOINT uses your Cloudflare account ID.`
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

/** MinIO/S3 buckets must exist before upload — create on first use (local only). */
export async function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
      } catch (err) {
        if (isCloudStorage()) {
          throw cloudBucketError(err);
        }
        const name = storageErrorName(err);
        if (name === "AccessDenied" || name === "Forbidden") {
          throw new Error(
            `Storage access denied for bucket "${BUCKET}". Check S3 credentials and bucket name.`
          );
        }
        await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
        console.log(`[STORAGE] Created bucket: ${BUCKET}`);
      }
    })();
  }
  await bucketReady;
}

export function buildStorageKey(
  organizationId: string,
  folder: string,
  fileName: string
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `org/${organizationId}/${folder}/${Date.now()}-${safeName}`;
}

function organizationIdFromKey(key: string): string | null {
  const match = key.match(/^org\/([^/]+)\//);
  return match?.[1] ?? null;
}

function categoryFromKey(key: string, fallback?: string): string {
  if (fallback) return fallback;
  const folder = key.split("/")[2];
  if (folder === "backups") return "backup";
  if (folder === "work-orders") return "document";
  return folder || "file";
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  options?: { organizationId?: string; category?: string }
) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const organizationId = options?.organizationId ?? organizationIdFromKey(key);

  if (organizationId) {
    const { assertCloudStorageAllowed } = await import(
      "@/services/storage-quota.service"
    );
    await assertCloudStorageAllowed(organizationId, BigInt(buf.length));
  }

  await ensureBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buf,
      ContentType: contentType,
    })
  );

  if (organizationId) {
    const { recordStorageUpload } = await import(
      "@/services/storage-quota.service"
    );
    await recordStorageUpload({
      organizationId,
      storageKey: key,
      byteSize: BigInt(buf.length),
      category: categoryFromKey(key, options?.category),
    });
  }

  return key;
}

export async function getSignedDownloadUrl(key: string, expiresIn = 900) {
  await ensureBucket();
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteFile(key: string) {
  await ensureBucket();
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  await ensureBucket();
  const response = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  const stream = response.Body;
  if (!stream) throw new Error("File not found");
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
