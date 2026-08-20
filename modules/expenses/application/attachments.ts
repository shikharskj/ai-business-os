import type { StorageAdapter } from "@/lib/storage/types";
import {
  deleteDocument,
  getDocumentForTenant,
  listDocumentsForOwner,
  uploadDocument,
  type DocumentRecord,
} from "@/modules/documents";
import type { DocumentRepository } from "@/modules/documents/infrastructure/repositories";
import { ExpenseNotFoundError } from "@/modules/expenses/domain/errors";
import type { ExpenseRepository } from "@/modules/expenses/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";

export async function attachExpenseDocument(input: {
  tenantId: string;
  actorUserId: string;
  expenseId: string;
  filename: string;
  bytes: Uint8Array;
  maxBytes?: number;
  expenses: ExpenseRepository;
  documents: DocumentRepository;
  storage: StorageAdapter;
  audit: AuditRepository;
}): Promise<DocumentRecord> {
  const expense = await input.expenses.findExpenseById(input.tenantId, input.expenseId);
  if (!expense) {
    throw new ExpenseNotFoundError();
  }

  return uploadDocument({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    ownerRecordType: "EXPENSE",
    ownerRecordId: expense.id,
    filename: input.filename,
    bytes: input.bytes,
    maxBytes: input.maxBytes,
    storage: input.storage,
    documents: input.documents,
    audit: input.audit,
  });
}

export async function listExpenseDocuments(input: {
  tenantId: string;
  expenseId: string;
  expenses: ExpenseRepository;
  documents: DocumentRepository;
}): Promise<DocumentRecord[]> {
  const expense = await input.expenses.findExpenseById(input.tenantId, input.expenseId);
  if (!expense) {
    throw new ExpenseNotFoundError();
  }

  return listDocumentsForOwner({
    tenantId: input.tenantId,
    ownerRecordType: "EXPENSE",
    ownerRecordId: expense.id,
    documents: input.documents,
  });
}

export async function deleteExpenseDocument(input: {
  tenantId: string;
  actorUserId: string;
  expenseId: string;
  documentId: string;
  expenses: ExpenseRepository;
  documents: DocumentRepository;
  storage: StorageAdapter;
  audit: AuditRepository;
}): Promise<DocumentRecord> {
  const expense = await input.expenses.findExpenseById(input.tenantId, input.expenseId);
  if (!expense) {
    throw new ExpenseNotFoundError();
  }

  const record = await getDocumentForTenant({
    tenantId: input.tenantId,
    documentId: input.documentId,
    documents: input.documents,
  });
  if (record.ownerRecordType !== "EXPENSE" || record.ownerRecordId !== expense.id) {
    throw new ExpenseNotFoundError();
  }

  return deleteDocument({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    documentId: record.id,
    documents: input.documents,
    storage: input.storage,
    audit: input.audit,
  });
}
