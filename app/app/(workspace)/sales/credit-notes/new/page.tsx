import Link from "next/link";

import { CreditNoteForm } from "@/components/business/credit-note-form";
import { PageHeader } from "@/components/shell/page-header";
import { DocumentPreviewPageShell } from "@/components/shell/document-form-preview-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { GST_SALES_STATUSES } from "@/modules/reporting/domain/gst-types";
import { listInvoices } from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import {
  quantity,
  subtractQuantity,
  toQuantityMajorString,
} from "@/modules/inventory/domain/quantity";

export default async function NewCreditNotePage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  const tenant = await authorize("credit-note:create");
  const params = await searchParams;
  const invoices = await listInvoices({
    tenantId: tenant.tenantId,
    statuses: [...GST_SALES_STATUSES],
    sales: prismaSalesRepository,
  });
  const remainingByInvoice = await Promise.all(
    invoices.map(async (invoice) => {
      const credited = await prismaSalesRepository.creditedQuantityByInvoiceLine({
        tenantId: tenant.tenantId,
        invoiceId: invoice.id,
      });
      return {
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
    })
  );
  const available = remainingByInvoice.filter((invoice) => invoice.lines.length > 0);
  const initialInvoiceId =
    params.invoiceId && available.some((invoice) => invoice.id === params.invoiceId)
      ? params.invoiceId
      : undefined;
  const ordered = initialInvoiceId
    ? [
        available.find((invoice) => invoice.id === initialInvoiceId)!,
        ...available.filter((invoice) => invoice.id !== initialInvoiceId),
      ]
    : available;

  return (
    <DocumentPreviewPageShell>
      <PageHeader
        title="New credit note"
        description="Credit remaining quantity from a posted invoice. GST is calculated by the tax engine when you save."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/sales/credit-notes" />}
          >
            Back to credit notes
          </Button>
        }
      />
      {ordered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-8 text-base">
            <p>Post an invoice before issuing a credit note.</p>
            <div>
              <Button
                nativeButton={false}
                render={<Link href="/app/sales/invoices" />}
              >
                View invoices
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <CreditNoteForm
          today={todayInTimezone(tenant.business.timezone)}
          invoices={ordered}
          lockInvoice={Boolean(initialInvoiceId)}
        />
      )}
    </DocumentPreviewPageShell>
  );
}
