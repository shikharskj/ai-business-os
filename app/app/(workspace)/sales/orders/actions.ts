"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { authorize, AuthorizationError } from "@/lib/security";
import { CatalogError } from "@/modules/catalog";
import { createPrismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { PartyError } from "@/modules/party";
import { createPrismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { scheduleNotificationOutboxProcessing } from "@/modules/notifications";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import { toMajorString } from "@/modules/shared-kernel/money";
import {
  prismaHsnSacRepository,
  prismaTaxRateRepository,
} from "@/modules/tax/infrastructure/prisma-tax-repositories";
import type { GstSupplyType } from "@/modules/tax/domain/types";
import {
  SalesError,
  SalesOrderAlreadyConvertedError,
  cancelSalesOrder,
  confirmSalesOrder,
  convertSalesOrderToInvoice,
  createSalesOrder,
  previewSalesOrder,
  salesOrderInputSchema,
  salesOrderLineInputSchema,
  taxContextFromTenant,
  toSalesOrderFields,
  updateSalesOrder,
} from "@/modules/sales";
import { createPrismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";

export type SalesOrderActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  invoiceId?: string;
};

export type SalesOrderPreviewState = {
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

function readSalesOrderFields(formData: FormData) {
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

  return toSalesOrderFields(
    salesOrderInputSchema.parse({
      customerId: formData.get("customerId"),
      issuedOn: formData.get("issuedOn"),
      expectedOn: formData.get("expectedOn") || undefined,
      notes: formData.get("notes") || undefined,
      placeOfSupplyStateCode: formData.get("placeOfSupplyStateCode"),
      lines,
    })
  );
}

function mapError(error: unknown): SalesOrderActionState | null {
  if (error instanceof ZodError) {
    return { fieldErrors: formatZodErrors(error) };
  }
  if (error instanceof AuthorizationError) {
    return { error: "You don't have permission to perform this action." };
  }
  if (error instanceof PartyError || error instanceof CatalogError || error instanceof SalesError) {
    return { error: error.message };
  }
  return null;
}

export async function createSalesOrderAction(
  _prevState: SalesOrderActionState,
  formData: FormData
): Promise<SalesOrderActionState> {
  let salesOrderId: string;
  let tenantId: string;

  try {
    const tenant = await authorize("sales-order:create");
    tenantId = tenant.tenantId;
    const fields = readSalesOrderFields(formData);
    const salesOrder = await prisma.$transaction(async (tx) =>
      createSalesOrder({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        fields,
        taxContext: taxContextFromTenant(tenant),
        sales: createPrismaSalesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        catalog: createPrismaCatalogRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      })
    );
    salesOrderId = salesOrder.id;
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  scheduleNotificationOutboxProcessing(tenantId);
  revalidatePath("/app/sales/orders");
  redirect(`/app/sales/orders/${salesOrderId}?created=1`);
}

export async function updateSalesOrderAction(
  _prevState: SalesOrderActionState,
  formData: FormData
): Promise<SalesOrderActionState> {
  const salesOrderId = String(formData.get("salesOrderId") ?? "");
  let tenantId: string;

  try {
    const tenant = await authorize("sales-order:update");
    tenantId = tenant.tenantId;
    const fields = readSalesOrderFields(formData);
    await prisma.$transaction(async (tx) =>
      updateSalesOrder({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        salesOrderId,
        fields,
        taxContext: taxContextFromTenant(tenant),
        sales: createPrismaSalesRepository(tx),
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

  scheduleNotificationOutboxProcessing(tenantId);
  revalidatePath("/app/sales/orders");
  revalidatePath(`/app/sales/orders/${salesOrderId}`);
  redirect(`/app/sales/orders/${salesOrderId}?saved=1`);
}

async function statusAction(
  permission: "sales-order:update" | "sales-order:cancel",
  salesOrderId: string,
  run: (input: {
    tenantId: string;
    actorUserId: string;
    sales: SalesRepository;
    audit: AuditRepository;
    outbox: OutboxRepository;
  }) => Promise<unknown>
): Promise<SalesOrderActionState> {
  let tenantId: string;
  try {
    const tenant = await authorize(permission);
    tenantId = tenant.tenantId;
    await prisma.$transaction(async (tx) =>
      run({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        sales: createPrismaSalesRepository(tx),
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
  revalidatePath("/app/sales/orders");
  revalidatePath(`/app/sales/orders/${salesOrderId}`);
  return {};
}

export async function confirmSalesOrderAction(
  salesOrderId: string
): Promise<SalesOrderActionState> {
  return statusAction("sales-order:update", salesOrderId, (ctx) =>
    confirmSalesOrder({ ...ctx, salesOrderId })
  );
}

export async function cancelSalesOrderAction(
  salesOrderId: string
): Promise<SalesOrderActionState> {
  return statusAction("sales-order:cancel", salesOrderId, (ctx) =>
    cancelSalesOrder({ ...ctx, salesOrderId })
  );
}

export async function convertSalesOrderAction(
  salesOrderId: string
): Promise<SalesOrderActionState> {
  let invoiceId: string;
  let tenantId: string;

  try {
    const tenant = await authorize("invoice:create");
    tenantId = tenant.tenantId;
    const invoice = await prisma.$transaction(async (tx) =>
      convertSalesOrderToInvoice({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        salesOrderId,
        taxContext: taxContextFromTenant(tenant),
        sales: createPrismaSalesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        catalog: createPrismaCatalogRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      })
    );
    invoiceId = invoice.id;
  } catch (error) {
    if (error instanceof SalesOrderAlreadyConvertedError) {
      return { error: error.message };
    }
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  scheduleNotificationOutboxProcessing(tenantId);
  revalidatePath("/app/sales/orders");
  revalidatePath(`/app/sales/orders/${salesOrderId}`);
  revalidatePath("/app/sales/invoices");
  revalidatePath(`/app/sales/invoices/${invoiceId}`);
  return { invoiceId };
}

export async function previewSalesOrderTotalsAction(input: {
  salesOrderId?: string;
  customerId: string;
  issuedOn: string;
  expectedOn?: string;
  notes?: string;
  placeOfSupplyStateCode: string;
  lines: Array<{
    productId: string;
    quantity: string;
    unitPrice: string;
    discount: string;
  }>;
}): Promise<SalesOrderPreviewState> {
  try {
    const tenant = await authorize(
      input.salesOrderId ? "sales-order:update" : "sales-order:create"
    );
    const completeLines = input.lines.filter((line) => {
      try {
        salesOrderLineInputSchema.parse(line);
        return true;
      } catch {
        return false;
      }
    });

    if (!input.customerId || completeLines.length === 0) {
      return {};
    }

    const fields = toSalesOrderFields(
      salesOrderInputSchema.parse({
        customerId: input.customerId,
        issuedOn: input.issuedOn,
        expectedOn: input.expectedOn || undefined,
        notes: input.notes || undefined,
        placeOfSupplyStateCode: input.placeOfSupplyStateCode,
        lines: completeLines,
      })
    );

    const prepared = await previewSalesOrder({
      tenantId: tenant.tenantId,
      fields,
      taxContext: taxContextFromTenant(tenant),
      parties: createPrismaPartyRepository(prisma),
      catalog: createPrismaCatalogRepository(prisma),
      taxRates: prismaTaxRateRepository,
      hsnSac: prismaHsnSacRepository,
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
