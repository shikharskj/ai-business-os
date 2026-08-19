export type StoredObject = {
  key: string;
  contentType: string;
  byteLength: number;
  body: Uint8Array;
};

export type StorageUploadInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
};

export type StorageAdapter = {
  upload(input: StorageUploadInput): Promise<void>;
  download(key: string): Promise<StoredObject>;
  delete(key: string): Promise<void>;
};

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export class StorageNotFoundError extends StorageError {
  constructor(key: string) {
    super(`Stored object was not found: ${key}`);
    this.name = "StorageNotFoundError";
  }
}

export class StorageLimitError extends StorageError {
  constructor(maxBytes: number) {
    super(`File exceeds the maximum size of ${maxBytes} bytes.`);
    this.name = "StorageLimitError";
  }
}

export class StorageConfigError extends StorageError {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigError";
  }
}
