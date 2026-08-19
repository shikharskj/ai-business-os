import type { Prisma } from "@/generated/prisma/client";

export function toPrismaJson(
  value: unknown,
  label: string
): Prisma.InputJsonValue {
  if (!isInputJsonValue(value)) {
    throw new Error(
      `${label} contains unsupported JSON values (bigint, undefined, or non-JSON types)`
    );
  }
  return value;
}

function isInputJsonValue(value: unknown): value is Prisma.InputJsonValue {
  if (value === null) {
    return true;
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isInputJsonValue);
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return false;
    }
    return Object.values(value).every(isInputJsonValue);
  }
  return false;
}
