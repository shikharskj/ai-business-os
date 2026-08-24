import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CreditNoteForm } from "@/components/business/credit-note-form";
import { PageHeader } from "@/components/shell/page-header";
import { DocumentPreviewPageShell } from "@/components/shell/document-form-preview-layout";
import { Button } from "@/components/ui/button";
import { authorize } from "@/lib/security";
import {
  CreditNoteNotFoundError,
  getCreditNote,
  getInvoice,
} from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import {
  quantity,
  subtractQuantity,
  toQuantityMajorString,
} from "@/modules/inventory/domain/quantity";

export default async function EditCreditNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("invoice:update");
  const { id } = await params;

  let creditNote;
  try {
    creditNote = await getCreditNote({
      tenantId: tenant.tenantId,
      creditNoteId: id,
      sales: prismaSalesRepository,
    });
  } catch (error) {
    if (error instanceof CreditNoteNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (creditNote.status !== "DRAFT") {
    redirect(`/app/sales/credit-notes/${creditNote.id}`);
  }

  const invoice = await getInvoice({
    tenantId: tenant.tenantId,
    invoiceId: creditNote.invoiceId,
    sales: prismaSalesRepository,
  });
  const credited = await prismaSalesRepository.creditedQuantityByInvoiceLine({
    tenantId: tenant.tenantId,
    invoiceId: invoice.id,
    excludeCreditNoteId: creditNote.id,
  });
  const invoiceOption = {
    id: invoice.id,
    number: invoice.number,
    customerName: invoice.customerName,
    issuedOn: invoice.issuedOn,
    lines: invoice.lines
      .map((line) => {
        const remaining = subtractQuantity(
          line.quantity,
          credited.get(line.id) ?? quantity(0n)
        );
        if (remaining.amountMinor <= 0n) {
          return null;
        }
        return {
          id: line.id,
          productName: line.productName,
          sku: line.sku,
          unitOfMeasurement: line.unitOfMeasurement,
          remainingMajor: toQuantityMajorString(remaining),
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null),
  };

  return (
    <DocumentPreviewPageShell>
      <PageHeader
        title={`Edit ${creditNote.number}`}
        description="GST is recalculated when you save."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/app/sales/credit-notes/${creditNote.id}`} />}
          >
            Back
          </Button>
        }
      />
      <CreditNoteForm
        today={todayInTimezone(tenant.business.timezone)}
        invoices={[invoiceOption]}
        creditNote={creditNote}
        lockInvoice
      />
    </DocumentPreviewPageShell>
  );
}
