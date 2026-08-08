import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET ?? "project-z";

let bucketReady: Promise<void> | null = null;

/** MinIO/S3 buckets must exist before upload — create on first use. */
export async function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
      } catch {
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

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  await ensureBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
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
