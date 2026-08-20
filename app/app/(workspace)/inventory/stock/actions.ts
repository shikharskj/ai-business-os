"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { authorize, AuthorizationError } from "@/lib/security";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import { businessDate } from "@/modules/shared-kernel/dates";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import {
  InventoryError,
  adjustStockInputSchema,
  openingStockInputSchema,
  quantityFromMajor,
  recordOpeningStock,
  recordStockAdjustment,
} from "@/modules/inventory";
import type { InventoryMovementDirection } from "@/modules/inventory";

export type StockActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: {
    quantity?: string;
    occurredOn?: string;
    reason?: string;
    direction?: InventoryMovementDirection;
  };
};

const audit = createPrismaAuditRepository(prisma);
const outbox = createPrismaOutboxRepository(prisma);

function formatZodErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [
      issue.path.join(".") || "form",
      issue.message,
    ])
  );
}

export async function recordOpeningStockAction(
  _prevState: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const submittedValues = {
    quantity: String(formData.get("quantity") || ""),
    occurredOn: String(formData.get("occurredOn") || ""),
    reason: String(formData.get("reason") || ""),
  };
  const productId = String(formData.get("productId") ?? "");

  try {
    const tenant = await authorize("inventory:adjust");
    const fields = openingStockInputSchema.parse({
      productId,
      quantity: formData.get("quantity"),
      occurredOn: formData.get("occurredOn"),
      reason: formData.get("reason") || undefined,
    });

    await recordOpeningStock({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      productId: fields.productId,
      quantity: quantityFromMajor(fields.quantity),
      occurredOn: businessDate(fields.occurredOn),
      reason: fields.reason,
      catalog: prismaCatalogRepository,
      inventory: prismaInventoryRepository,
      audit,
      outbox,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error), values: submittedValues };
    }
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to adjust inventory." };
    }
    if (error instanceof InventoryError) {
      return { error: error.message, values: submittedValues };
    }
    throw error;
  }

  revalidatePath("/app/inventory/stock");
  revalidatePath(`/app/inventory/stock/${productId}`);
  revalidatePath(`/app/inventory/products/${productId}`);
  redirect(`/app/inventory/stock/${productId}?saved=1`);
}

export async function recordStockAdjustmentAction(
  _prevState: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const submittedValues = {
    quantity: String(formData.get("quantity") || ""),
    occurredOn: String(formData.get("occurredOn") || ""),
    reason: String(formData.get("reason") || ""),
    direction:
      formData.get("direction") === "OUT"
        ? ("OUT" as const)
        : ("IN" as const),
  };
  const productId = String(formData.get("productId") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");

  try {
    const tenant = await authorize("inventory:adjust");
    const fields = adjustStockInputSchema.parse({
      productId,
      direction: formData.get("direction"),
      quantity: formData.get("quantity"),
      occurredOn: formData.get("occurredOn"),
      reason: formData.get("reason"),
    });

    await recordStockAdjustment({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      productId: fields.productId,
      direction: fields.direction,
      quantity: quantityFromMajor(fields.quantity),
      occurredOn: businessDate(fields.occurredOn),
      reason: fields.reason,
      idempotencyKey: idempotencyKey || `adjustment:${crypto.randomUUID()}`,
      catalog: prismaCatalogRepository,
      inventory: prismaInventoryRepository,
      audit,
      outbox,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return { fieldErrors: formatZodErrors(error), values: submittedValues };
    }
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to adjust inventory." };
    }
    if (error instanceof InventoryError) {
      return { error: error.message, values: submittedValues };
    }
    throw error;
  }

  revalidatePath("/app/inventory/stock");
  revalidatePath(`/app/inventory/stock/${productId}`);
  revalidatePath(`/app/inventory/products/${productId}`);
  redirect(`/app/inventory/stock/${productId}?saved=1`);
}
