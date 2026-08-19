const STORAGE_KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/._-]*$/;

export function assertSafeStorageKey(key: string): void {
  if (
    !key ||
    key.includes("..") ||
    key.startsWith("/") ||
    key.includes("\\") ||
    !STORAGE_KEY_PATTERN.test(key)
  ) {
    throw new Error("Invalid storage key.");
  }
}

export function buildTenantStorageKey(input: {
  tenantId: string;
  ownerRecordType: string;
  objectId: string;
}): string {
  const tenantId = input.tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
  const ownerRecordType = input.ownerRecordType.replace(/[^a-zA-Z0-9_-]/g, "");
  const objectId = input.objectId.replace(/[^a-zA-Z0-9_-]/g, "");

  if (!tenantId || !ownerRecordType || !objectId) {
    throw new Error("Unable to build a storage key.");
  }

  return `${tenantId}/${ownerRecordType}/${objectId}`;
}
