import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentAttachmentList } from "@/components/business/document-attachment-list";
import { GstBreakdown } from "@/components/business/gst-breakdown";
import { UploadDocumentForm } from "@/components/business/upload-document-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import {
  deleteExpenseDocumentAction,
  uploadExpenseDocumentAction,
} from "@/app/app/(workspace)/expenses/actions";
import {
  EXPENSE_CATEGORY_LABELS,
  ExpenseNotFoundError,
  getExpense,
  listExpenseDocuments,
} from "@/modules/expenses";
import { prismaExpenseRepository } from "@/modules/expenses/infrastructure/prisma-expenses-repository";
import { prismaDocumentRepository } from "@/modules/documents/infrastructure/prisma-document-repository";
import { PAYMENT_METHOD_LABELS } from "@/modules/payments";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("expense:read");
  const { id } = await params;
  const canUpload = roleHasPermission(tenant.membership.role, "document:upload");
  const canDelete = roleHasPermission(tenant.membership.role, "document:delete");

  let expense;
  try {
    expense = await getExpense({
      tenantId: tenant.tenantId,
      expenseId: id,
      expenses: prismaExpenseRepository,
    });
  } catch (error) {
    if (error instanceof ExpenseNotFoundError) {
      notFound();
    }
    throw error;
  }

  const documents = await listExpenseDocuments({
    tenantId: tenant.tenantId,
    expenseId: expense.id,
    expenses: prismaExpenseRepository,
    documents: prismaDocumentRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <PageHeader
        title={expense.number}
        description={EXPENSE_CATEGORY_LABELS[expense.category]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/expenses" />}
          >
            Back
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card>
          <CardHeader>
            <CardTitle>GST</CardTitle>
          </CardHeader>
          <CardContent>
            <GstBreakdown
              taxableAmount={expense.taxableAmount}
              cgst={expense.cgst}
              sgst={expense.sgst}
              igst={expense.igst}
              totalTax={expense.totalTax}
              grandTotal={expense.grandTotal}
              supplyType={expense.supplyType}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-base">
            <p>
              <span className="text-muted-foreground">Date </span>
              {expense.incurredOn}
            </p>
            <p>
              <span className="text-muted-foreground">Paid by </span>
              {PAYMENT_METHOD_LABELS[expense.method]}
            </p>
            {expense.vendorGstin ? (
              <p>
                <span className="text-muted-foreground">Vendor GSTIN </span>
                {expense.vendorGstin}
              </p>
            ) : null}
            {expense.notes ? <p>{expense.notes}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {canUpload ? (
            <UploadDocumentForm action={uploadExpenseDocumentAction}>
              <input type="hidden" name="expenseId" value={expense.id} />
            </UploadDocumentForm>
          ) : (
            <p className="text-base text-muted-foreground">
              You can view and download files, but you cannot attach new evidence.
            </p>
          )}
          <DocumentAttachmentList
            documents={documents}
            canDelete={canDelete}
            emptyMessage="No supporting files yet. Attach a receipt or invoice scan for this expense."
            onDelete={deleteExpenseDocumentAction.bind(null, expense.id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
