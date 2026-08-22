"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { authorize, AuthorizationError } from "@/lib/security";
import {
  AccountingError,
  closeAccountingPeriod,
  closePeriodSchema,
  postAdjustmentJournal,
  postAdjustmentSchema,
  reversePostedJournal,
  reverseJournalSchema,
  toAdjustmentLines,
} from "@/modules/accounting";
import {
  createPrismaAccountRepository,
  createPrismaJournalRepository,
} from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import { businessDate, todayInTimezone } from "@/modules/shared-kernel/dates";
import { prismaBusinessRepository } from "@/modules/tenant/infrastructure/prisma-repositories";

export type AccountingActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function formatZodErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "form", issue.message])
  );
}

function mapError(error: unknown): AccountingActionState | null {
  if (error instanceof ZodError) {
    return { fieldErrors: formatZodErrors(error) };
  }
  if (error instanceof AuthorizationError) {
    return { error: "You don't have permission to perform this action." };
  }
  if (error instanceof AccountingError) {
    return { error: error.message };
  }
  return null;
}

export async function closePeriodAction(
  _prev: AccountingActionState,
  formData: FormData
): Promise<AccountingActionState> {
  try {
    const tenant = await authorize("accounting:post");
    const parsed = closePeriodSchema.parse({
      periodKey: formData.get("periodKey"),
    });
    await prisma.$transaction(async (tx) =>
      closeAccountingPeriod({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        periodKey: parsed.periodKey,
        today: todayInTimezone(tenant.business.timezone),
        businesses: {
          findById: async (tenantId) => {
            const record = await tx.business.findUnique({ where: { id: tenantId } });
            if (!record || record.id !== tenant.tenantId) {
              return null;
            }
            return {
              ...tenant.business,
              closedThroughPeriodKey: record.closedThroughPeriodKey,
            };
          },
          findByClerkOrganizationId: prismaBusinessRepository.findByClerkOrganizationId,
          create: prismaBusinessRepository.create,
          update: prismaBusinessRepository.update,
          deleteByClerkOrganizationId:
            prismaBusinessRepository.deleteByClerkOrganizationId,
          setClosedThroughPeriodKey: async (tenantId, periodKey) => {
            const record = await tx.business.update({
              where: { id: tenantId },
              data: { closedThroughPeriodKey: periodKey },
            });
            return {
              ...tenant.business,
              closedThroughPeriodKey: record.closedThroughPeriodKey,
            };
          },
          setLogoDocumentId: prismaBusinessRepository.setLogoDocumentId,
          clearLogoDocumentIdIfMatches: prismaBusinessRepository.clearLogoDocumentIdIfMatches,
        },
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

  revalidatePath("/app/accounting");
  revalidatePath("/app/accounting/periods");
  redirect("/app/accounting/periods?closed=1");
}

export async function postAdjustmentAction(
  _prev: AccountingActionState,
  formData: FormData
): Promise<AccountingActionState> {
  let journalId: string;
  try {
    const tenant = await authorize("accounting:post");
    const lineCount = Number(formData.get("lineCount") ?? 0);
    if (!Number.isSafeInteger(lineCount) || lineCount < 2 || lineCount > 50) {
      throw new ZodError([
        {
          code: "custom",
          path: ["lines"],
          message: "Add between 2 and 50 journal lines",
        },
      ]);
    }
    const lines = Array.from({ length: lineCount }, (_, index) => ({
      accountCode: String(formData.get(`line-${index}-accountCode`) ?? ""),
      description: String(formData.get(`line-${index}-description`) ?? ""),
      debit: String(formData.get(`line-${index}-debit`) ?? ""),
      credit: String(formData.get(`line-${index}-credit`) ?? ""),
    }));
    const fields = toAdjustmentLines(
      postAdjustmentSchema.parse({
        accountingDate: formData.get("accountingDate"),
        memo: formData.get("memo") || undefined,
        lines,
      })
    );

    const journal = await prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: tenant.tenantId },
      });
      return postAdjustmentJournal({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        accountingDate: fields.accountingDate,
        financialYearStartMonth: tenant.business.financialYearStartMonth,
        closedThroughPeriodKey: business?.closedThroughPeriodKey ?? null,
        memo: fields.memo,
        lines: fields.lines,
        accounts: createPrismaAccountRepository(tx),
        journals: createPrismaJournalRepository(tx),
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      });
    });
    journalId = journal.id;
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  revalidatePath("/app/accounting/journals");
  revalidatePath("/app/accounting/ledger");
  revalidatePath("/app/accounting/trial-balance");
  redirect(`/app/accounting/journals/${journalId}?created=1`);
}

export async function reverseJournalAction(
  _prev: AccountingActionState,
  formData: FormData
): Promise<AccountingActionState> {
  let reversalId: string;
  try {
    const tenant = await authorize("accounting:post");
    const parsed = reverseJournalSchema.parse({
      journalId: formData.get("journalId"),
      accountingDate:
        formData.get("accountingDate") ||
        todayInTimezone(tenant.business.timezone),
    });
    const reversal = await prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: tenant.tenantId },
      });
      return reversePostedJournal({
        tenantId: tenant.tenantId,
        actorUserId: tenant.membership.userId,
        journalId: parsed.journalId,
        accountingDate: businessDate(parsed.accountingDate),
        financialYearStartMonth: tenant.business.financialYearStartMonth,
        closedThroughPeriodKey: business?.closedThroughPeriodKey ?? null,
        accounts: createPrismaAccountRepository(tx),
        journals: createPrismaJournalRepository(tx),
        audit: createPrismaAuditRepository(tx),
        outbox: createPrismaOutboxRepository(tx),
      });
    });
    reversalId = reversal.id;
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }

  revalidatePath("/app/accounting/journals");
  revalidatePath("/app/accounting/ledger");
  revalidatePath("/app/accounting/trial-balance");
  redirect(`/app/accounting/journals/${reversalId}?created=1`);
}
