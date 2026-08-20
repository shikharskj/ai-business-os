"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { authorize, AuthorizationError } from "@/lib/security";
import { getStorageAdapter } from "@/lib/storage";
import { AccountingError } from "@/modules/accounting/domain/errors";
import {
  createPrismaAccountRepository,
  createPrismaJournalRepository,
} from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { DocumentError } from "@/modules/documents";
import { prismaDocumentRepository } from "@/modules/documents/infrastructure/prisma-document-repository";
import {
  attachExpenseDocument,
  deleteExpenseDocument,
  ExpenseError,
  expenseTaxContextFromTenant,
  recordExpense,
  recordExpenseSchema,
  toExpenseFields,
} from "@/modules/expenses";
import { createPrismaExpenseRepository } from "@/modules/expenses/infrastructure/prisma-expenses-repository";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import { TaxError } from "@/modules/tax";
import {
  prismaHsnSacRepository,
  prismaTaxRateRepository,
} from "@/modules/tax/infrastructure/prisma-tax-repositories";

export type ExpenseActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type ExpenseDocumentActionState = {
  error?: string;
};

function formatZodErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "form", issue.message])
  );
}

function mapError(error: unknown): ExpenseActionState | null {
  if (error instanceof ZodError) {
    return { fieldErrors: formatZodErrors(error) };
  }
  if (error instanceof AuthorizationError) {
    return { error: "You don't have permission to perform this action." };
  }
  if (
    error instanceof ExpenseError ||
    error instanceof AccountingError ||
    error instanceof TaxError
  ) {
    return { error: error.message };
  }
  return null;
}

export async function recordExpenseAction(
  _prevState: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  let expenseId: string;

  try {
    const tenant = await authorize("expense:create");
    const fields = toExpenseFields(
      recordExpenseSchema.parse({
        category: formData.get("category"),
        incurredOn: formData.get("incurredOn"),
        method: formData.get("method"),
        amount: formData.get("amount"),
        taxRateBps: formData.get("taxRateBps") || 0,
        vendorGstin: formData.get("vendorGstin") || undefined,
        notes: formData.get("notes") || undefined,
      })
    );
    const expense = await prisma.$transaction(async (tx) =>
      recordExpense({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        fields,
        taxContext: expenseTaxContextFromTenant(tenant),
        closedThroughPeriodKey: null,
        expenses: createPrismaExpenseRepository(tx),
        accounts: createPrismaAccountRepository(tx),
        journals: createPrismaJournalRepository(tx),
        taxRates: prismaTaxRateRepository,
        hsnSac: prismaHsnSacRepository,
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      })
    );
    expenseId = expense.id;
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  revalidatePath("/app/expenses");
  redirect(`/app/expenses/${expenseId}`);
}

export async function uploadExpenseDocumentAction(
  _prevState: ExpenseDocumentActionState,
  formData: FormData
): Promise<ExpenseDocumentActionState> {
  try {
    await authorize("expense:read");
    const tenant = await authorize("document:upload");
    const expenseId = String(formData.get("expenseId") ?? "");
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return { error: "Choose a file to upload." };
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return { error: `File size exceeds the ${maxBytes / (1024 * 1024)} MB limit.` };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    await attachExpenseDocument({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      expenseId,
      filename: file.name,
      bytes,
      maxBytes,
      expenses: createPrismaExpenseRepository(prisma),
      documents: prismaDocumentRepository,
      storage: getStorageAdapter(),
      audit: createPrismaAuditRepository(prisma),
    });

    revalidatePath(`/app/expenses/${expenseId}`);
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to attach files." };
    }
    if (error instanceof ExpenseError || error instanceof DocumentError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function deleteExpenseDocumentAction(
  expenseId: string,
  documentId: string
): Promise<ExpenseDocumentActionState> {
  try {
    await authorize("expense:read");
    const tenant = await authorize("document:delete");
    await deleteExpenseDocument({
      tenantId: tenant.tenantId,
      actorUserId: tenant.membership.userId,
      expenseId,
      documentId,
      expenses: createPrismaExpenseRepository(prisma),
      documents: prismaDocumentRepository,
      storage: getStorageAdapter(),
      audit: createPrismaAuditRepository(prisma),
    });
    revalidatePath(`/app/expenses/${expenseId}`);
    return {};
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "You don't have permission to remove this document." };
    }
    if (error instanceof ExpenseError || error instanceof DocumentError) {
      return { error: error.message };
    }
    throw error;
  }
}
