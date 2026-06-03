import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function buildClient(): S3Client {
  const region = process.env.STORAGE_REGION ?? "auto";
  const endpoint = process.env.STORAGE_ENDPOINT; // set for Cloudflare R2

  return new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: false } : {}),
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
    },
  });
}

declare global {
  // eslint-disable-next-line no-var
  var _s3: S3Client | undefined;
}

const s3 = globalThis._s3 ?? buildClient();
if (process.env.NODE_ENV !== "production") globalThis._s3 = s3;

const BUCKET = process.env.STORAGE_BUCKET ?? "";

/**
 * Upload a buffer to S3/R2 and return a public URL.
 *
 * @param key      Object key, e.g. "audio/scene-abc.mp3"
 * @param body     Raw buffer or Uint8Array
 * @param contentType  MIME type
 */
export async function uploadToStorage(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Return a public URL.
  // For R2: STORAGE_PUBLIC_URL = "https://<account>.r2.dev/<bucket>" or custom domain.
  // For S3: defaults to path-style URL.
  const base =
    process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, "") ??
    `https://${BUCKET}.s3.${process.env.STORAGE_REGION ?? "us-east-1"}.amazonaws.com`;

  return `${base}/${key}`;
}
