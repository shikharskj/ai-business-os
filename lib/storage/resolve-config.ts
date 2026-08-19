import { StorageConfigError } from "@/lib/storage/types";

export const DEFAULT_STORAGE_MAX_BYTES = 10 * 1024 * 1024;

export type StorageDriver = "local" | "r2";

export type StorageConfig =
  | {
      driver: "local";
      rootDir: string;
      maxBytes: number;
    }
  | {
      driver: "r2";
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
      endpoint?: string;
      maxBytes: number;
    };

export type StorageEnvInput = {
  nodeEnv: string;
  storageDriver?: string;
  localStorageRoot?: string;
  maxBytes?: number;
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2Bucket?: string;
  r2Endpoint?: string;
};

function parseMaxBytes(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_STORAGE_MAX_BYTES;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new StorageConfigError("STORAGE_MAX_BYTES must be a positive integer.");
  }

  return value;
}

export function resolveStorageDriver(input: StorageEnvInput): StorageDriver {
  const explicit = input.storageDriver?.trim();

  if (explicit === "local" || explicit === "r2") {
    return explicit;
  }

  if (explicit) {
    throw new StorageConfigError(
      `STORAGE_DRIVER must be "local" or "r2", received "${explicit}".`
    );
  }

  return input.nodeEnv === "production" ? "r2" : "local";
}

export function resolveStorageConfig(input: StorageEnvInput): StorageConfig {
  const driver = resolveStorageDriver(input);
  const maxBytes = parseMaxBytes(input.maxBytes);

  if (driver === "local") {
    if (input.nodeEnv === "production") {
      throw new StorageConfigError(
        "Local/filesystem storage is not allowed in production. Set STORAGE_DRIVER=r2 and provide Cloudflare R2 credentials."
      );
    }

    return {
      driver: "local",
      rootDir: input.localStorageRoot?.trim() || ".data/storage",
      maxBytes,
    };
  }

  const accountId = input.r2AccountId?.trim();
  const accessKeyId = input.r2AccessKeyId?.trim();
  const secretAccessKey = input.r2SecretAccessKey?.trim();
  const bucket = input.r2Bucket?.trim();
  const endpoint = input.r2Endpoint?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new StorageConfigError(
      "Cloudflare R2 configuration is required: CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, and CLOUDFLARE_R2_BUCKET."
    );
  }

  return {
    driver: "r2",
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: endpoint || undefined,
    maxBytes,
  };
}
