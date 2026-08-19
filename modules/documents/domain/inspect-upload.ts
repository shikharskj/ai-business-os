import {
  DocumentTooLargeError,
  DocumentValidationError,
  UnsupportedDocumentTypeError,
} from "@/modules/documents/domain/errors";
import {
  ALLOWED_DOCUMENT_CONTENT_TYPES,
  DEFAULT_DOCUMENT_MAX_BYTES,
  DOCUMENT_OWNER_TYPES,
  type AllowedDocumentContentType,
  type DocumentOwnerType,
} from "@/modules/documents/domain/types";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.byteLength < prefix.length) {
    return false;
  }

  return prefix.every((value, index) => bytes[index] === value);
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 12) {
    return false;
  }

  const riff =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;
  const webp =
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  return riff && webp;
}

export function sniffContentType(
  bytes: Uint8Array
): AllowedDocumentContentType | null {
  if (hasPrefix(bytes, PDF_MAGIC)) {
    return "application/pdf";
  }

  if (hasPrefix(bytes, JPEG_MAGIC)) {
    return "image/jpeg";
  }

  if (hasPrefix(bytes, PNG_MAGIC)) {
    return "image/png";
  }

  if (isWebp(bytes)) {
    return "image/webp";
  }

  return null;
}

export function sanitizeFilename(raw: string): string {
  const withoutPath = raw.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
  const cleaned = withoutPath.replace(/[\u0000-\u001f<>:"|?*]/g, "_");

  if (!cleaned || cleaned === "." || cleaned === "..") {
    return "upload";
  }

  return cleaned.slice(0, 200);
}

function extensionOf(filename: string): string {
  const name = filename.toLowerCase();
  const index = name.lastIndexOf(".");
  if (index <= 0 || index === name.length - 1) {
    return "";
  }

  return name.slice(index);
}

const EXTENSIONS_BY_TYPE: Record<AllowedDocumentContentType, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export function isDocumentOwnerType(value: string): value is DocumentOwnerType {
  return (DOCUMENT_OWNER_TYPES as readonly string[]).includes(value);
}

export function isAllowedContentType(
  value: string
): value is AllowedDocumentContentType {
  return (ALLOWED_DOCUMENT_CONTENT_TYPES as readonly string[]).includes(value);
}

export function inspectUploadBytes(input: {
  filename: string;
  bytes: Uint8Array;
  maxBytes?: number;
}): {
  filename: string;
  contentType: AllowedDocumentContentType;
  sizeBytes: number;
} {
  const maxBytes = input.maxBytes ?? DEFAULT_DOCUMENT_MAX_BYTES;
  const filename = sanitizeFilename(input.filename);

  if (input.bytes.byteLength === 0) {
    throw new DocumentValidationError("The uploaded file is empty.");
  }

  if (input.bytes.byteLength > maxBytes) {
    throw new DocumentTooLargeError(maxBytes);
  }

  const sniffed = sniffContentType(input.bytes);
  if (!sniffed) {
    throw new UnsupportedDocumentTypeError();
  }

  const extension = extensionOf(filename);
  if (!EXTENSIONS_BY_TYPE[sniffed].includes(extension)) {
    throw new UnsupportedDocumentTypeError();
  }

  return {
    filename,
    contentType: sniffed,
    sizeBytes: input.bytes.byteLength,
  };
}
