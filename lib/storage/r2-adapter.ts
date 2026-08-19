import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { assertSafeStorageKey } from "@/lib/storage/keys";
import {
  StorageLimitError,
  StorageNotFoundError,
  type StorageAdapter,
} from "@/lib/storage/types";

async function bodyToBytes(
  body: { transformToByteArray?: () => Promise<Uint8Array> } | undefined
): Promise<Uint8Array> {
  if (!body?.transformToByteArray) {
    throw new Error("R2 download returned an empty body.");
  }

  return body.transformToByteArray();
}

export function createR2StorageAdapter(options: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
  maxBytes: number;
}): StorageAdapter {
  const endpoint =
    options.endpoint ??
    `https://${options.accountId}.r2.cloudflarestorage.com`;
  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    requestHandler: {
      connectionTimeout: 30_000,
      socketTimeout: 30_000,
      requestTimeout: 60_000,
      throwOnRequestTimeout: true,
    },
  });

  return {
    async upload(input) {
      assertSafeStorageKey(input.key);
      if (input.body.byteLength > options.maxBytes) {
        throw new StorageLimitError(options.maxBytes);
      }

      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          ContentLength: input.body.byteLength,
        })
      );
    },

    async download(key) {
      assertSafeStorageKey(key);

      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: options.bucket,
            Key: key,
          })
        );
        const body = await bodyToBytes(response.Body);
        return {
          key,
          contentType: response.ContentType ?? "application/octet-stream",
          byteLength: body.byteLength,
          body,
        };
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          (("name" in error &&
            (error.name === "NoSuchKey" || error.name === "NotFound")) ||
            ("$metadata" in error &&
              typeof error.$metadata === "object" &&
              error.$metadata !== null &&
              "httpStatusCode" in error.$metadata &&
              error.$metadata.httpStatusCode === 404))
        ) {
          throw new StorageNotFoundError(key);
        }

        throw error;
      }
    },

    async delete(key) {
      assertSafeStorageKey(key);
      await client.send(
        new DeleteObjectCommand({
          Bucket: options.bucket,
          Key: key,
        })
      );
    },
  };
}
