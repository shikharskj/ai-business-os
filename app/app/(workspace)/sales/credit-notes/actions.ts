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
import { createPrismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import { toMajorString } from "@/modules/shared-kernel/money";
import {
  prismaHsnSacRepository,
  prismaTaxRateRepository,
} from "@/modules/tax/infrastructure/prisma-tax-repositories";
import type { GstSupplyType } from "@/modules/tax/domain/types";
import {
  cancelCreditNote,
  createCreditNote,
  creditNoteInputSchema,
  creditNoteLineInputSchema,
  postCreditNote,
  previewCreditNote,
  SalesError,
  taxContextFromTenant,
  toCreditNoteFields,
  updateCreditNote,
} from "@/modules/sales";
import { createPrismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";

export type CreditNoteActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type CreditNotePreviewState = {
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

function readCreditNoteFields(formData: FormData) {
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
    invoiceLineId: formData.get(`line-${index}-invoiceLineId`),
    quantity: formData.get(`line-${index}-quantity`),
  }));

  return toCreditNoteFields(
    creditNoteInputSchema.parse({
      invoiceId: formData.get("invoiceId"),
      issuedOn: formData.get("issuedOn"),
      notes: formData.get("notes") || undefined,
      lines,
    })
  );
}

function mapError(error: unknown): CreditNoteActionState | null {
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

export async function createCreditNoteAction(
  _prevState: CreditNoteActionState,
  formData: FormData
): Promise<CreditNoteActionState> {
  let creditNoteId: string;
  let tenantId: string;

  try {
    const tenant = await authorize("credit-note:create");
    tenantId = tenant.tenantId;
    const fields = readCreditNoteFields(formData);
    const creditNote = await prisma.$transaction(async (tx) =>
      createCreditNote({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        fields,
        taxContext: taxContextFromTenant(tenant),
        sales: createPrismaSalesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        catalog: createPrismaCatalogRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        payments: createPrismaPaymentRepository(tx),
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      })
    );
    creditNoteId = creditNote.id;
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  scheduleNotificationOutboxProcessing(tenantId);
  revalidatePath("/app/sales/credit-notes");
  redirect(`/app/sales/credit-notes/${creditNoteId}?created=1`);
}

export async function updateCreditNoteAction(
  _prevState: CreditNoteActionState,
  formData: FormData
): Promise<CreditNoteActionState> {
  const creditNoteId = String(formData.get("creditNoteId") ?? "");
  let tenantId: string;

  try {
    const tenant = await authorize("credit-note:update");
    tenantId = tenant.tenantId;
    const fields = readCreditNoteFields(formData);
    await prisma.$transaction(async (tx) =>
      updateCreditNote({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        creditNoteId,
        fields,
        taxContext: taxContextFromTenant(tenant),
        sales: createPrismaSalesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        catalog: createPrismaCatalogRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        payments: createPrismaPaymentRepository(tx),
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
  revalidatePath("/app/sales/credit-notes");
  revalidatePath(`/app/sales/credit-notes/${creditNoteId}`);
  redirect(`/app/sales/credit-notes/${creditNoteId}?saved=1`);
}

async function statusAction(
  permission: "credit-note:update" | "credit-note:cancel",
  creditNoteId: string,
  run: (input: {
    tenantId: string;
    actorUserId: string;
    sales: SalesRepository;
    audit: AuditRepository;
    outbox: OutboxRepository;
  }) => Promise<unknown>
): Promise<CreditNoteActionState> {
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
  revalidatePath("/app/sales/credit-notes");
  revalidatePath(`/app/sales/credit-notes/${creditNoteId}`);
  revalidatePath("/app/sales/invoices");
  return {};
}

export async function postCreditNoteAction(
  creditNoteId: string
): Promise<CreditNoteActionState> {
  let tenantId: string;
  try {
    const tenant = await authorize("credit-note:update");
    tenantId = tenant.tenantId;
    await prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: tenant.tenantId },
      });
      return postCreditNote({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        creditNoteId,
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
        payments: createPrismaPaymentRepository(tx),
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
  revalidatePath("/app/sales/credit-notes");
  revalidatePath(`/app/sales/credit-notes/${creditNoteId}`);
  revalidatePath("/app/sales/invoices");
  return {};
}

export async function cancelCreditNoteAction(
  creditNoteId: string
): Promise<CreditNoteActionState> {
  return statusAction("credit-note:cancel", creditNoteId, (ctx) =>
    cancelCreditNote({ ...ctx, creditNoteId })
  );
}

export async function previewCreditNoteTotalsAction(input: {
  creditNoteId?: string;
  invoiceId: string;
  issuedOn: string;
  notes?: string;
  lines: Array<{ invoiceLineId: string; quantity: string }>;
}): Promise<CreditNotePreviewState> {
  try {
    const tenant = await authorize(
      input.creditNoteId ? "credit-note:update" : "credit-note:create"
    );
    const cappedLines = input.lines.slice(0, 1000);
    const completeLines = cappedLines
      .map((line) => {
        const result = creditNoteLineInputSchema.safeParse(line);
        return result.success ? result.data : null;
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);

    if (!input.invoiceId || completeLines.length === 0) {
      return {};
    }

    const fields = toCreditNoteFields(
      creditNoteInputSchema.parse({
        invoiceId: input.invoiceId,
        issuedOn: input.issuedOn,
        notes: input.notes || undefined,
        lines: completeLines,
      })
    );

    const prepared = await previewCreditNote({
      tenantId: tenant.tenantId,
      fields,
      taxContext: taxContextFromTenant(tenant),
      excludeCreditNoteId: input.creditNoteId,
      sales: createPrismaSalesRepository(prisma),
      parties: createPrismaPartyRepository(prisma),
      catalog: createPrismaCatalogRepository(prisma),
      taxRates: prismaTaxRateRepository,
      hsnSac: prismaHsnSacRepository,
      payments: createPrismaPaymentRepository(prisma),
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
