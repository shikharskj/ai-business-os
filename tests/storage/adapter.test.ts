import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createLocalStorageAdapter } from "@/lib/storage/local-adapter";
import { createMemoryStorageAdapter } from "@/lib/storage/memory-adapter";
import { resolveStorageConfig } from "@/lib/storage/resolve-config";
import { StorageConfigError, StorageLimitError } from "@/lib/storage/types";

describe("resolveStorageConfig", () => {
  it("uses local storage in development when driver is omitted", () => {
    const config = resolveStorageConfig({ nodeEnv: "development" });
    expect(config.driver).toBe("local");
  });

  it("defaults production to R2 and fails closed without credentials", () => {
    expect(() =>
      resolveStorageConfig({ nodeEnv: "production" })
    ).toThrow(StorageConfigError);
  });

  it("rejects local storage in production even when requested", () => {
    expect(() =>
      resolveStorageConfig({ nodeEnv: "production", storageDriver: "local" })
    ).toThrow(/not allowed in production/);
  });

  it("rejects an unknown driver", () => {
    expect(() =>
      resolveStorageConfig({ nodeEnv: "development", storageDriver: "s3" })
    ).toThrow(StorageConfigError);
  });

  it("accepts complete R2 configuration", () => {
    const config = resolveStorageConfig({
      nodeEnv: "production",
      storageDriver: "r2",
      r2AccountId: "account",
      r2AccessKeyId: "key",
      r2SecretAccessKey: "secret",
      r2Bucket: "docs",
    });

    expect(config).toMatchObject({
      driver: "r2",
      accountId: "account",
      bucket: "docs",
    });
  });
});

describe("memory storage adapter", () => {
  it("rejects oversized uploads", async () => {
    const storage = createMemoryStorageAdapter({ maxBytes: 8 });
    await expect(
      storage.upload({
        key: "t1/BUSINESS/a",
        body: new Uint8Array(9),
        contentType: "application/pdf",
      })
    ).rejects.toBeInstanceOf(StorageLimitError);
  });
});

describe("local storage adapter", () => {
  it("uploads and downloads bytes from the filesystem", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "ai-bos-storage-"));
    const storage = createLocalStorageAdapter({ rootDir, maxBytes: 1024 });
    const body = new Uint8Array([1, 2, 3, 4]);

    await storage.upload({
      key: "tenant-a/BUSINESS/doc-1",
      body,
      contentType: "application/pdf",
    });

    const stored = await storage.download("tenant-a/BUSINESS/doc-1");
    expect(Array.from(stored.body)).toEqual([1, 2, 3, 4]);

    await storage.delete("tenant-a/BUSINESS/doc-1");
    await rm(rootDir, { recursive: true, force: true });
  });
});
