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
import { PartyError } from "@/modules/party";
import { createPrismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import {
  PaymentError,
  recordCustomerPayment,
  recordCustomerPaymentSchema,
  toPaymentFields,
} from "@/modules/payments";
import { createPrismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { SalesError } from "@/modules/sales";
import { createPrismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { scheduleNotificationOutboxProcessing } from "@/modules/notifications";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";

export type PaymentActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function formatZodErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "form", issue.message])
  );
}

function readPaymentFields(formData: FormData) {
  const allocationCount = Number(formData.get("allocationCount") ?? 0);
  if (
    !Number.isSafeInteger(allocationCount) ||
    allocationCount < 0 ||
    allocationCount > 1000
  ) {
    throw new ZodError([
      {
        code: "custom",
        path: ["allocations"],
        message: "Invalid allocation count",
      },
    ]);
  }

  const allocations = Array.from({ length: allocationCount }, (_, index) => ({
    invoiceId: String(formData.get(`allocation-${index}-invoiceId`) ?? ""),
    amount: String(formData.get(`allocation-${index}-amount`) ?? "").trim(),
  })).filter((row) => {
    const trimmed = row.amount.trim();
    if (trimmed === "" || trimmed === ".") {
      return false;
    }
    try {
      return parseFloat(trimmed) > 0;
    } catch {
      return false;
    }
  });

  return toPaymentFields(
    recordCustomerPaymentSchema.parse({
      customerId: formData.get("customerId"),
      receivedOn: formData.get("receivedOn"),
      method: formData.get("method"),
      amount: formData.get("amount"),
      reference: formData.get("reference") || undefined,
      notes: formData.get("notes") || undefined,
      allocations,
    })
  );
}

function mapError(error: unknown): PaymentActionState | null {
  if (error instanceof ZodError) {
    return { fieldErrors: formatZodErrors(error) };
  }
  if (error instanceof AuthorizationError) {
    return { error: "You don't have permission to perform this action." };
  }
  if (
    error instanceof PartyError ||
    error instanceof PaymentError ||
    error instanceof SalesError ||
    error instanceof AccountingError
  ) {
    return { error: error.message };
  }
  return null;
}

export async function recordCustomerPaymentAction(
  _prevState: PaymentActionState,
  formData: FormData
): Promise<PaymentActionState> {
  let paymentId: string;
  let tenantId: string;

  try {
    const tenant = await authorize("payment:create");
    tenantId = tenant.tenantId;
    const fields = readPaymentFields(formData);
    const payment = await prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: tenant.tenantId },
      });
      return recordCustomerPayment({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        fields,
        financialYearStartMonth: tenant.business.financialYearStartMonth,
        closedThroughPeriodKey: business?.closedThroughPeriodKey ?? null,
        payments: createPrismaPaymentRepository(tx),
        sales: createPrismaSalesRepository(tx),
        parties: createPrismaPartyRepository(tx),
        accounts: createPrismaAccountRepository(tx),
        journals: createPrismaJournalRepository(tx),
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      });
    });
    paymentId = payment.id;
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  scheduleNotificationOutboxProcessing(tenantId);
  revalidatePath("/app/sales/payments");
  revalidatePath("/app/sales/invoices");
  revalidatePath("/app/sales/customers");
  redirect(`/app/sales/payments/${paymentId}`);
}
