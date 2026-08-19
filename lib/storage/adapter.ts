import "server-only";

import { env } from "@/lib/env";
import { createStorageAdapterFromEnv } from "@/lib/storage/create-adapter";
import type { StorageAdapter } from "@/lib/storage/types";

let adapter: StorageAdapter | undefined;

export function getStorageAdapter(): StorageAdapter {
  if (!adapter) {
    adapter = createStorageAdapterFromEnv({
      nodeEnv: env.NODE_ENV,
      storageDriver: env.STORAGE_DRIVER,
      localStorageRoot: env.LOCAL_STORAGE_ROOT,
      maxBytes: env.STORAGE_MAX_BYTES,
      r2AccountId: env.CLOUDFLARE_R2_ACCOUNT_ID,
      r2AccessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      r2SecretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      r2Bucket: env.CLOUDFLARE_R2_BUCKET,
      r2Endpoint: env.CLOUDFLARE_R2_ENDPOINT,
    });
  }

  return adapter;
}

export function resetStorageAdapterForTests(): void {
  adapter = undefined;
}
