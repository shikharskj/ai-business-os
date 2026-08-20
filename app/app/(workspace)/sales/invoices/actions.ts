"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { authorize, AuthorizationError } from "@/lib/security";
import { AccountingError } from "@/modules/accounting/domain/errors";
import {
  createPrismaAccountRepository,
  createPrismaJournalRepository,
} from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { CatalogError } from "@/modules/catalog";
import { createPrismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaDocumentRepository } from "@/modules/documents/infrastructure/prisma-document-repository";
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
  cancelInvoice,
  createInvoice,
  exportInvoicePdf,
  invoiceInputSchema,
  postInvoice,
  SalesError,
  taxContextFromTenant,
  toInvoiceFields,
  updateInvoice,
} from "@/modules/sales";
import { createPrismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";

export type InvoiceActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  documentId?: string;
};

function formatZodErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "form", issue.message])
  );
}

function readInvoiceFields(formData: FormData) {
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

  return toInvoiceFields(
    invoiceInputSchema.parse({
      customerId: formData.get("customerId"),
      issuedOn: formData.get("issuedOn"),
      dueOn: formData.get("dueOn") || undefined,
      notes: formData.get("notes") || undefined,
      placeOfSupplyStateCode: formData.get("placeOfSupplyStateCode"),
      lines,
    })
  );
}

function mapError(error: unknown): InvoiceActionState | null {
  if (error instanceof ZodError) {
    return { fieldErrors: formatZodErrors(error) };
  }
  if (error instanceof AuthorizationError) {
    return { error: "You don't have permission to perform this action." };
  }
  if (
    error instanceof PartyError ||
    error instanceof CatalogError ||
    error instanceof SalesError ||
    error instanceof AccountingError ||
    error instanceof InventoryError
  ) {
    return { error: error.message };
  }
  return null;
}

export async function createInvoiceAction(
  _prevState: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  let invoiceId: string;

  try {
    const tenant = await authorize("invoice:create");
    const fields = readInvoiceFields(formData);
    const invoice = await prisma.$transaction(async (tx) =>
      createInvoice({
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
    invoiceId = invoice.id;
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  revalidatePath("/app/sales/invoices");
  redirect(`/app/sales/invoices/${invoiceId}`);
}

export async function updateInvoiceAction(
  _prevState: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const invoiceId = String(formData.get("invoiceId") ?? "");

  try {
    const tenant = await authorize("invoice:update");
    const fields = readInvoiceFields(formData);
    await prisma.$transaction(async (tx) =>
      updateInvoice({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        invoiceId,
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

  revalidatePath("/app/sales/invoices");
  revalidatePath(`/app/sales/invoices/${invoiceId}`);
  redirect(`/app/sales/invoices/${invoiceId}?saved=1`);
}

async function statusAction(
  permission: "invoice:update" | "invoice:cancel",
  invoiceId: string,
  run: (input: {
    tenantId: string;
    actorUserId: string;
    sales: SalesRepository;
    audit: AuditRepository;
    outbox: OutboxRepository;
  }) => Promise<unknown>
): Promise<InvoiceActionState> {
  try {
    const tenant = await authorize(permission);
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

  revalidatePath("/app/sales/invoices");
  revalidatePath(`/app/sales/invoices/${invoiceId}`);
  return {};
}

export async function postInvoiceAction(invoiceId: string): Promise<InvoiceActionState> {
  try {
    const tenant = await authorize("invoice:update");
    await prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: tenant.tenantId },
      });
      return postInvoice({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        invoiceId,
        taxContext: taxContextFromTenant(tenant),
        closedThroughPeriodKey: business?.closedThroughPeriodKey ?? null,
        sales: createPrismaSalesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        catalog: createPrismaCatalogRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        inventory: createPrismaInventoryRepository(tx),
        accounts: createPrismaAccountRepository(tx),
        journals: createPrismaJournalRepository(tx),
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

  revalidatePath("/app/sales/invoices");
  revalidatePath(`/app/sales/invoices/${invoiceId}`);
  return {};
}

export async function cancelInvoiceAction(invoiceId: string): Promise<InvoiceActionState> {
  return statusAction("invoice:cancel", invoiceId, (ctx) =>
    cancelInvoice({ ...ctx, invoiceId })
  );
}

export async function exportInvoicePdfAction(
  invoiceId: string
): Promise<InvoiceActionState> {
  try {
    const tenant = await authorize("invoice:read");
    const document = await prisma.$transaction(async (tx) =>
      exportInvoicePdf({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        businessName: tenant.business.name,
        invoiceId,
        sales: createPrismaSalesRepository(tx),
        documents: prismaDocumentRepository,
        storage: getStorageAdapter(),
        audit: createPrismaAuditRepository(tx),
      })
    );
    return { documentId: document.id };
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }
}
