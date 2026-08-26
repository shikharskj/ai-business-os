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
import { scheduleNotificationOutboxProcessing } from "@/modules/notifications";
import { createPrismaSupplierPaymentRepository } from "@/modules/payments/infrastructure/prisma-supplier-payments-repository";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import { toMajorString } from "@/modules/shared-kernel/money";
import {
  prismaHsnSacRepository,
  prismaTaxRateRepository,
} from "@/modules/tax/infrastructure/prisma-tax-repositories";
import type { GstSupplyType } from "@/modules/tax/domain/types";
import {
  cancelPurchaseReturn,
  createPurchaseReturn,
  postPurchaseReturn,
  previewPurchaseReturn,
  PurchaseError,
  purchaseReturnInputSchema,
  purchaseReturnLineInputSchema,
  taxContextFromTenant,
  toPurchaseReturnFields,
  updatePurchaseReturn,
} from "@/modules/purchases";
import { createPrismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import type { PurchasesRepository } from "@/modules/purchases/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";

export type PurchaseReturnActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type PurchaseReturnPreviewState = {
  taxableAmountMajor?: string;
  cgstMajor?: string;
  sgstMajor?: string;
  igstMajor?: string;
  totalTaxMajor?: string;
  grandTotalMajor?: string;
  supplyType?: GstSupplyType | "MIXED";
  error?: string;
};

function formatZodErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "form", issue.message])
  );
}

function readPurchaseReturnFields(formData: FormData) {
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
    purchaseLineId: formData.get(`line-${index}-purchaseLineId`),
    quantity: formData.get(`line-${index}-quantity`),
  }));

  return toPurchaseReturnFields(
    purchaseReturnInputSchema.parse({
      purchaseId: formData.get("purchaseId"),
      issuedOn: formData.get("issuedOn"),
      notes: formData.get("notes") || undefined,
      lines,
    })
  );
}

function mapError(error: unknown): PurchaseReturnActionState | null {
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

export async function createPurchaseReturnAction(
  _prevState: PurchaseReturnActionState,
  formData: FormData
): Promise<PurchaseReturnActionState> {
  let purchaseReturnId: string;
  let tenantId: string;

  try {
    const tenant = await authorize("purchase-return:create");
    tenantId = tenant.tenantId;
    const fields = readPurchaseReturnFields(formData);
    const purchaseReturn = await prisma.$transaction(async (tx) =>
      createPurchaseReturn({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        fields,
        taxContext: taxContextFromTenant(tenant),
        purchases: createPrismaPurchasesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        catalog: createPrismaCatalogRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        supplierPayments: createPrismaSupplierPaymentRepository(tx),
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      })
    );
    purchaseReturnId = purchaseReturn.id;
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  scheduleNotificationOutboxProcessing(tenantId);
  revalidatePath("/app/purchases/returns");
  redirect(`/app/purchases/returns/${purchaseReturnId}?created=1`);
}

export async function updatePurchaseReturnAction(
  _prevState: PurchaseReturnActionState,
  formData: FormData
): Promise<PurchaseReturnActionState> {
  const purchaseReturnId = String(formData.get("purchaseReturnId") ?? "");
  let tenantId: string;

  try {
    const tenant = await authorize("purchase-return:update");
    tenantId = tenant.tenantId;
    const fields = readPurchaseReturnFields(formData);
    await prisma.$transaction(async (tx) =>
      updatePurchaseReturn({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        purchaseReturnId,
        fields,
        taxContext: taxContextFromTenant(tenant),
        purchases: createPrismaPurchasesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        catalog: createPrismaCatalogRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        supplierPayments: createPrismaSupplierPaymentRepository(tx),
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

  scheduleNotificationOutboxProcessing(tenantId);
  revalidatePath("/app/purchases/returns");
  revalidatePath(`/app/purchases/returns/${purchaseReturnId}`);
  redirect(`/app/purchases/returns/${purchaseReturnId}?saved=1`);
}

async function statusAction(
  permission: "purchase-return:update" | "purchase-return:cancel",
  purchaseReturnId: string,
  run: (input: {
    tenantId: string;
    actorUserId: string;
    purchases: PurchasesRepository;
    audit: AuditRepository;
    outbox: OutboxRepository;
  }) => Promise<unknown>
): Promise<PurchaseReturnActionState> {
  let tenantId: string;
  try {
    const tenant = await authorize(permission);
    tenantId = tenant.tenantId;
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

  scheduleNotificationOutboxProcessing(tenantId);
  revalidatePath("/app/purchases/returns");
  revalidatePath(`/app/purchases/returns/${purchaseReturnId}`);
  revalidatePath("/app/purchases/bills");
  return {};
}

export async function postPurchaseReturnAction(
  purchaseReturnId: string
): Promise<PurchaseReturnActionState> {
  let tenantId: string;
  try {
    const tenant = await authorize("purchase-return:update");
    tenantId = tenant.tenantId;
    await prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: tenant.tenantId },
      });
      return postPurchaseReturn({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        purchaseReturnId,
        taxContext: taxContextFromTenant(tenant),
        closedThroughPeriodKey: business?.closedThroughPeriodKey ?? null,
        purchases: createPrismaPurchasesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        catalog: createPrismaCatalogRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        inventory: createPrismaInventoryRepository(tx),
        accounts: createPrismaAccountRepository(tx),
        journals: createPrismaJournalRepository(tx),
        supplierPayments: createPrismaSupplierPaymentRepository(tx),
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      });
    });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  scheduleNotificationOutboxProcessing(tenantId);
  revalidatePath("/app/purchases/returns");
  revalidatePath(`/app/purchases/returns/${purchaseReturnId}`);
  revalidatePath("/app/purchases/bills");
  return {};
}

export async function cancelPurchaseReturnAction(
  purchaseReturnId: string
): Promise<PurchaseReturnActionState> {
  return statusAction("purchase-return:cancel", purchaseReturnId, (ctx) =>
    cancelPurchaseReturn({ ...ctx, purchaseReturnId })
  );
}

export async function previewPurchaseReturnTotalsAction(input: {
  purchaseReturnId?: string;
  purchaseId: string;
  issuedOn: string;
  notes?: string;
  lines: Array<{ purchaseLineId: string; quantity: string }>;
}): Promise<PurchaseReturnPreviewState> {
  try {
    const tenant = await authorize(
      input.purchaseReturnId ? "purchase-return:update" : "purchase-return:create"
    );
    const completeLines = input.lines
      .slice(0, 1000)
      .map((line) => {
        const result = purchaseReturnLineInputSchema.safeParse(line);
        return result.success ? result.data : null;
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);

    if (!input.purchaseId || completeLines.length === 0) {
      return {};
    }

    const fields = toPurchaseReturnFields(
      purchaseReturnInputSchema.parse({
        purchaseId: input.purchaseId,
        issuedOn: input.issuedOn,
        notes: input.notes || undefined,
        lines: completeLines,
      })
    );

    const prepared = await previewPurchaseReturn({
      tenantId: tenant.tenantId,
      fields,
      taxContext: taxContextFromTenant(tenant),
      excludePurchaseReturnId: input.purchaseReturnId,
      purchases: createPrismaPurchasesRepository(prisma),
      parties: createPrismaPartyRepository(prisma),
      catalog: createPrismaCatalogRepository(prisma),
      taxRates: prismaTaxRateRepository,
      hsnSac: prismaHsnSacRepository,
      supplierPayments: createPrismaSupplierPaymentRepository(prisma),
    });

    return {
      taxableAmountMajor: toMajorString(prepared.taxableAmount),
      cgstMajor: toMajorString(prepared.cgst),
      sgstMajor: toMajorString(prepared.sgst),
      igstMajor: toMajorString(prepared.igst),
      totalTaxMajor: toMajorString(prepared.totalTax),
      grandTotalMajor: toMajorString(prepared.grandTotal),
      supplyType: prepared.supplyType,
    };
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return { error: mapped.error ?? "Could not price this draft yet." };
    }
    throw error;
  }
}
