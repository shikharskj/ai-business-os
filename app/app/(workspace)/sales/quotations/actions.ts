"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { authorize, AuthorizationError } from "@/lib/security";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import { CatalogError } from "@/modules/catalog";
import { createPrismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaDocumentRepository } from "@/modules/documents/infrastructure/prisma-document-repository";
import { PartyError } from "@/modules/party";
import { createPrismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import {
  prismaHsnSacRepository,
  prismaTaxRateRepository,
} from "@/modules/tax/infrastructure/prisma-tax-repositories";
import {
  QuotationAlreadyConvertedError,
  SalesError,
  acceptQuotation,
  buildQuotationDocumentView,
  cancelQuotation,
  convertQuotationToInvoice,
  createQuotation,
  exportQuotationPdf,
  previewQuotation,
  quotationInputSchema,
  quotationLineInputSchema,
  sendQuotation,
  taxContextFromTenant,
  toQuotationFields,
  updateQuotation,
  type QuotationDocumentView,
} from "@/modules/sales";
import { businessLogoUrl } from "@/modules/tenant";
import { createPrismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";

export type QuotationActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  invoiceId?: string;
  documentId?: string;
};

function formatZodErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "form", issue.message])
  );
}

function readQuotationFields(formData: FormData) {
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

  return toQuotationFields(
    quotationInputSchema.parse({
      customerId: formData.get("customerId"),
      issuedOn: formData.get("issuedOn"),
      validUntil: formData.get("validUntil") || undefined,
      notes: formData.get("notes") || undefined,
      placeOfSupplyStateCode: formData.get("placeOfSupplyStateCode"),
      lines,
    })
  );
}

function mapError(error: unknown): QuotationActionState | null {
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

export async function createQuotationAction(
  _prevState: QuotationActionState,
  formData: FormData
): Promise<QuotationActionState> {
  let quotationId: string;

  try {
    const tenant = await authorize("quotation:create");
    const fields = readQuotationFields(formData);
    const quotation = await prisma.$transaction(async (tx) =>
      createQuotation({
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
    quotationId = quotation.id;
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  revalidatePath("/app/sales/quotations");
  redirect(`/app/sales/quotations/${quotationId}?created=1`);
}

export async function updateQuotationAction(
  _prevState: QuotationActionState,
  formData: FormData
): Promise<QuotationActionState> {
  const quotationId = String(formData.get("quotationId") ?? "");

  try {
    const tenant = await authorize("quotation:update");
    const fields = readQuotationFields(formData);
    await prisma.$transaction(async (tx) =>
      updateQuotation({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        quotationId,
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

  revalidatePath("/app/sales/quotations");
  revalidatePath(`/app/sales/quotations/${quotationId}`);
  redirect(`/app/sales/quotations/${quotationId}?saved=1`);
}

async function statusAction(
  permission: "quotation:update" | "quotation:cancel",
  quotationId: string,
  run: (input: {
    tenantId: string;
    actorUserId: string;
    sales: SalesRepository;
    audit: AuditRepository;
    outbox: OutboxRepository;
  }) => Promise<unknown>
): Promise<QuotationActionState> {
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

  revalidatePath("/app/sales/quotations");
  revalidatePath(`/app/sales/quotations/${quotationId}`);
  return {};
}

export async function sendQuotationAction(quotationId: string): Promise<QuotationActionState> {
  return statusAction("quotation:update", quotationId, (ctx) =>
    sendQuotation({ ...ctx, quotationId })
  );
}

export async function acceptQuotationAction(quotationId: string): Promise<QuotationActionState> {
  return statusAction("quotation:update", quotationId, (ctx) =>
    acceptQuotation({ ...ctx, quotationId })
  );
}

export async function cancelQuotationAction(quotationId: string): Promise<QuotationActionState> {
  return statusAction("quotation:cancel", quotationId, (ctx) =>
    cancelQuotation({ ...ctx, quotationId })
  );
}

export async function convertQuotationAction(quotationId: string): Promise<QuotationActionState> {
  let invoiceId: string;

  try {
    const tenant = await authorize("invoice:create");
    const invoice = await prisma.$transaction(async (tx) =>
      convertQuotationToInvoice({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        quotationId,
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
    if (error instanceof QuotationAlreadyConvertedError) {
      return { error: error.message };
    }
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  revalidatePath("/app/sales/quotations");
  revalidatePath(`/app/sales/quotations/${quotationId}`);
  revalidatePath("/app/sales/invoices");
  revalidatePath(`/app/sales/invoices/${invoiceId}`);
  return { invoiceId };
}

export async function exportQuotationPdfAction(
  quotationId: string
): Promise<QuotationActionState> {
  try {
    const tenant = await authorize("quotation:read");
    await authorize("document:upload");

    const document = await exportQuotationPdf({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      business: tenant.business,
      quotationId,
      sales: createPrismaSalesRepository(prisma),
      parties: createPrismaPartyRepository(prisma),
      documents: prismaDocumentRepository,
      storage: getStorageAdapter(),
      audit: createPrismaAuditRepository(prisma),
    });

    return { documentId: document.id };
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }
}

export type QuotationPreviewState = {
  view?: QuotationDocumentView;
  error?: string;
};

export async function previewQuotationTotalsAction(input: {
  quotationId?: string;
  number?: string;
  customerId: string;
  issuedOn: string;
  validUntil?: string;
  notes?: string;
  placeOfSupplyStateCode: string;
  lines: Array<{
    productId: string;
    quantity: string;
    unitPrice: string;
    discount: string;
  }>;
}): Promise<QuotationPreviewState> {
  try {
    const tenant = await authorize(
      input.quotationId ? "quotation:update" : "quotation:create"
    );
    const completeLines = input.lines.filter((line) => {
      try {
        quotationLineInputSchema.parse(line);
        return true;
      } catch {
        return false;
      }
    });

    if (!input.customerId || completeLines.length === 0) {
      return {};
    }

    const fields = toQuotationFields(
      quotationInputSchema.parse({
        customerId: input.customerId,
        issuedOn: input.issuedOn,
        validUntil: input.validUntil || undefined,
        notes: input.notes || undefined,
        placeOfSupplyStateCode: input.placeOfSupplyStateCode,
        lines: completeLines,
      })
    );

    const parties = createPrismaPartyRepository(prisma);
    const catalog = createPrismaCatalogRepository(prisma);
    const [prepared, customer] = await Promise.all([
      previewQuotation({
        tenantId: tenant.tenantId,
        fields,
        taxContext: taxContextFromTenant(tenant),
        parties,
        catalog,
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
      }),
      parties.findCustomerById(tenant.tenantId, input.customerId),
    ]);

    return {
      view: buildQuotationDocumentView({
        number: input.number?.trim() || "Draft",
        issuedOn: fields.issuedOn,
        validUntil: fields.validUntil ?? null,
        notes: fields.notes ?? null,
        placeOfSupplyStateCode: fields.placeOfSupplyStateCode ?? "",
        seller: tenant.business,
        buyer: customer,
        logoUrl: businessLogoUrl(tenant.business.logoDocumentId),
        prepared,
      }),
    };
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return { error: mapped.error ?? "Could not price this draft yet." };
    }
    throw error;
  }
}
