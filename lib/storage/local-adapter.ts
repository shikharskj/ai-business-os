import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertSafeStorageKey } from "@/lib/storage/keys";
import {
  StorageLimitError,
  StorageNotFoundError,
  type StorageAdapter,
} from "@/lib/storage/types";

function resolveObjectPath(rootDir: string, key: string): string {
  assertSafeStorageKey(key);
  const resolvedRoot = path.resolve(rootDir);
  const objectPath = path.resolve(resolvedRoot, key);
  const relative = path.relative(resolvedRoot, objectPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid storage key.");
  }

  return objectPath;
}

export function createLocalStorageAdapter(options: {
  rootDir: string;
  maxBytes: number;
}): StorageAdapter {
  const rootDir = path.resolve(options.rootDir);
  const maxBytes = options.maxBytes;

  return {
    async upload(input) {
      if (input.body.byteLength > maxBytes) {
        throw new StorageLimitError(maxBytes);
      }

      const objectPath = resolveObjectPath(rootDir, input.key);
      const metadataPath = `${objectPath}.meta`;
      await mkdir(path.dirname(objectPath), { recursive: true });
      await writeFile(objectPath, input.body, { mode: 0o644 });
      await chmod(objectPath, 0o644);
      await writeFile(
        metadataPath,
        JSON.stringify({ contentType: input.contentType }),
        { mode: 0o644 }
      );
      await chmod(metadataPath, 0o644);
    },

    async download(key) {
      const objectPath = resolveObjectPath(rootDir, key);
      const metadataPath = `${objectPath}.meta`;

      try {
        const body = await readFile(objectPath);
        let contentType = "application/octet-stream";

        try {
          const metadataRaw = await readFile(metadataPath, "utf-8");
          const metadata = JSON.parse(metadataRaw);
          if (metadata.contentType) {
            contentType = metadata.contentType;
          }
        } catch {
          // If metadata file doesn't exist or is invalid, use default
        }

        return {
          key,
          contentType,
          byteLength: body.byteLength,
          body: new Uint8Array(body),
        };
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          throw new StorageNotFoundError(key);
        }

        throw error;
      }
    },

    async delete(key) {
      const objectPath = resolveObjectPath(rootDir, key);
      const metadataPath = `${objectPath}.meta`;

      try {
        await unlink(objectPath);
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return;
        }

        throw error;
      }

      try {
        await unlink(metadataPath);
      } catch {
        // Ignore errors when deleting metadata file
      }
    },
  };
}
