import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  class FakeCommand {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  return {
    S3Client: vi.fn(function S3Client() {
      return { send };
    }),
    PutObjectCommand: FakeCommand,
    GetObjectCommand: FakeCommand,
    DeleteObjectCommand: FakeCommand,
  };
});

describe("R2 storage adapter (mocked S3)", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("uploads, downloads, and deletes via S3 commands", async () => {
    const { createR2StorageAdapter } = await import(
      "@/lib/storage/r2-adapter"
    );
    const storage = createR2StorageAdapter({
      accountId: "acct",
      accessKeyId: "key",
      secretAccessKey: "secret",
      bucket: "docs",
      maxBytes: 1024,
    });

    const body = new Uint8Array([9, 8, 7]);
    send.mockResolvedValueOnce({});
    await storage.upload({
      key: "tenant-a/BUSINESS/doc-1",
      body,
      contentType: "application/pdf",
    });
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      input: {
        Bucket: "docs",
        Key: "tenant-a/BUSINESS/doc-1",
        ContentType: "application/pdf",
        ContentLength: 3,
      },
    });

    send.mockResolvedValueOnce({
      ContentType: "application/pdf",
      Body: {
        transformToByteArray: async () => body,
      },
    });
    const downloaded = await storage.download("tenant-a/BUSINESS/doc-1");
    expect(Array.from(downloaded.body)).toEqual([9, 8, 7]);
    expect(downloaded.contentType).toBe("application/pdf");

    send.mockResolvedValueOnce({});
    await storage.delete("tenant-a/BUSINESS/doc-1");
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("maps missing objects to StorageNotFoundError", async () => {
    const { createR2StorageAdapter } = await import(
      "@/lib/storage/r2-adapter"
    );
    const { StorageNotFoundError } = await import("@/lib/storage/types");
    const storage = createR2StorageAdapter({
      accountId: "acct",
      accessKeyId: "key",
      secretAccessKey: "secret",
      bucket: "docs",
      maxBytes: 1024,
    });

    send.mockRejectedValueOnce({ name: "NoSuchKey" });
    await expect(storage.download("tenant-a/BUSINESS/missing")).rejects.toBeInstanceOf(
      StorageNotFoundError
    );
  });
});
