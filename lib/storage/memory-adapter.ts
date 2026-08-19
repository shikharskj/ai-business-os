import {
  StorageLimitError,
  StorageNotFoundError,
  type StorageAdapter,
  type StoredObject,
} from "@/lib/storage/types";

export function createMemoryStorageAdapter(options: {
  maxBytes: number;
}): StorageAdapter & { objects: Map<string, StoredObject> } {
  const objects = new Map<string, StoredObject>();
  const maxBytes = options.maxBytes;

  return {
    objects,
    async upload(input) {
      if (input.body.byteLength > maxBytes) {
        throw new StorageLimitError(maxBytes);
      }

      objects.set(input.key, {
        key: input.key,
        contentType: input.contentType,
        byteLength: input.body.byteLength,
        body: new Uint8Array(input.body),
      });
    },
    async download(key) {
      const stored = objects.get(key);
      if (!stored) {
        throw new StorageNotFoundError(key);
      }
      return {
        ...stored,
        body: new Uint8Array(stored.body),
      };
    },
    async delete(key) {
      objects.delete(key);
    },
  };
}
