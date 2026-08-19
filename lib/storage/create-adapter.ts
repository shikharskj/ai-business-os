import { createLocalStorageAdapter } from "@/lib/storage/local-adapter";
import { createR2StorageAdapter } from "@/lib/storage/r2-adapter";
import {
  resolveStorageConfig,
  type StorageEnvInput,
} from "@/lib/storage/resolve-config";
import type { StorageAdapter } from "@/lib/storage/types";

export function createStorageAdapterFromEnv(
  input: StorageEnvInput
): StorageAdapter {
  const config = resolveStorageConfig(input);

  if (config.driver === "local") {
    return createLocalStorageAdapter({
      rootDir: config.rootDir,
      maxBytes: config.maxBytes,
    });
  }

  return createR2StorageAdapter({
    accountId: config.accountId,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    bucket: config.bucket,
    endpoint: config.endpoint,
    maxBytes: config.maxBytes,
  });
}
