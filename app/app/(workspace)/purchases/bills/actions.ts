"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { authorize, AuthorizationError } from "@/lib/security";
import { AccountingError } from "@/modules/accounting/domain/errors";
import {
  createPrismaAccountRepository,
  createPrismaJournalRepository,
} from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { CatalogError } from "@/modules/catalog";
import { createPrismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { InventoryError } from "@/modules/inventory/domain/errors";
import { createPrismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { PartyError } from "@/modules/party";
import { createPrismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  prismaHsnSacRepository,
  prismaTaxRateRepository,
} from "@/modules/tax/infrastructure/prisma-tax-repositories";
import {
  cancelPurchase,
  createPurchase,
  postPurchase,
  purchaseInputSchema,
  PurchaseError,
  taxContextFromTenant,
  toPurchaseFields,
  updatePurchase,
} from "@/modules/purchases";
import { createPrismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import type { PurchasesRepository } from "@/modules/purchases/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";

export type PurchaseActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function formatZodErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "form", issue.message])
  );
}

function readPurchaseFields(formData: FormData, currency: string = "INR") {
  const lineCount = Number(formData.get("lineCount") ?? 0);
  if (!Number.isSafeInteger(lineCount) || lineCount < 0 || lineCount > 1000) {
    throw new ZodError([
      {
        code: "custom",
        path: ["lines"],
        message: "Invalid line count",
      },
    ]);
  }
  const lines = Array.from({ length: lineCount }, (_, index) => ({
    productId: formData.get(`line-${index}-productId`),
    quantity: formData.get(`line-${index}-quantity`),
    unitPrice: formData.get(`line-${index}-unitPrice`),
    discount: formData.get(`line-${index}-discount`) || "0",
  }));

  return toPurchaseFields(
    purchaseInputSchema.parse({
      supplierId: formData.get("supplierId"),
      issuedOn: formData.get("issuedOn"),
      dueOn: formData.get("dueOn") || undefined,
      notes: formData.get("notes") || undefined,
      placeOfSupplyStateCode: formData.get("placeOfSupplyStateCode"),
      lines,
    }),
    currency
  );
}

function mapError(error: unknown): PurchaseActionState | null {
  if (error instanceof ZodError) {
    return { fieldErrors: formatZodErrors(error) };
  }
  if (error instanceof AuthorizationError) {
    return { error: "You don't have permission to perform this action." };
  }
  if (
    error instanceof PartyError ||
    error instanceof CatalogError ||
    error instanceof PurchaseError ||
    error instanceof AccountingError ||
    error instanceof InventoryError
  ) {
    return { error: error.message };
  }
  return null;
}

export async function createPurchaseAction(
  _prevState: PurchaseActionState,
  formData: FormData
): Promise<PurchaseActionState> {
  let purchaseId: string;

  try {
    const tenant = await authorize("purchase:create");
    const taxContext = taxContextFromTenant(tenant);
    const fields = readPurchaseFields(formData, taxContext.currency);
    const purchase = await prisma.$transaction(async (tx) =>
      createPurchase({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        fields,
        taxContext,
        purchases: createPrismaPurchasesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        catalog: createPrismaCatalogRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      })
    );
    purchaseId = purchase.id;
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  revalidatePath("/app/purchases/bills");
  redirect(`/app/purchases/bills/${purchaseId}`);
}

export async function updatePurchaseAction(
  _prevState: PurchaseActionState,
  formData: FormData
): Promise<PurchaseActionState> {
  const purchaseId = String(formData.get("purchaseId") ?? "");

  try {
    const tenant = await authorize("purchase:update");
    const taxContext = taxContextFromTenant(tenant);
    const fields = readPurchaseFields(formData, taxContext.currency);
    await prisma.$transaction(async (tx) =>
      updatePurchase({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        purchaseId,
        fields,
        taxContext,
        purchases: createPrismaPurchasesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        catalog: createPrismaCatalogRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      })
    );
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  revalidatePath("/app/purchases/bills");
  revalidatePath(`/app/purchases/bills/${purchaseId}`);
  redirect(`/app/purchases/bills/${purchaseId}?saved=1`);
}

async function statusAction(
  permission: "purchase:update" | "purchase:cancel",
  purchaseId: string,
  run: (input: {
    tenantId: string;
    actorUserId: string;
    purchases: PurchasesRepository;
    audit: AuditRepository;
    outbox: OutboxRepository;
  }) => Promise<unknown>
): Promise<PurchaseActionState> {
  try {
    const tenant = await authorize(permission);
    await prisma.$transaction(async (tx) =>
      run({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        purchases: createPrismaPurchasesRepository(tx),
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      })
    );
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  revalidatePath("/app/purchases/bills");
  revalidatePath(`/app/purchases/bills/${purchaseId}`);
  return {};
}

export async function postPurchaseAction(purchaseId: string): Promise<PurchaseActionState> {
  let supplierId: string | undefined;

  try {
    const tenant = await authorize("purchase:update");
    const purchase = await prisma.$transaction(async (tx) =>
      postPurchase({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        purchaseId,
        taxContext: taxContextFromTenant(tenant),
        closedThroughPeriodKey: null,
        purchases: createPrismaPurchasesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        catalog: createPrismaCatalogRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        inventory: createPrismaInventoryRepository(tx),
        accounts: createPrismaAccountRepository(tx),
        journals: createPrismaJournalRepository(tx),
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      })
    );
    supplierId = purchase.supplierId;
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  revalidatePath("/app/purchases/bills");
  revalidatePath(`/app/purchases/bills/${purchaseId}`);
  revalidatePath("/app/purchases/suppliers");
  if (supplierId) {
    revalidatePath(`/app/purchases/suppliers/${supplierId}`);
  }
  return {};
}

export async function cancelPurchaseAction(purchaseId: string): Promise<PurchaseActionState> {
  return statusAction("purchase:cancel", purchaseId, (ctx) =>
    cancelPurchase({ ...ctx, purchaseId })
  );
}
