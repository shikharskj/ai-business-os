import Link from "next/link";
import { notFound } from "next/navigation";

import { EntityActivityPanel } from "@/components/business/entity-activity-panel";
import { formatDisplayDate } from "@/components/business/inventory-labels";
import { GstBreakdown } from "@/components/business/gst-breakdown";
import { MoneyDisplay } from "@/components/business/money-display";
import {
  QuotationDocumentPreview,
} from "@/components/business/quotation-document";
import { StatusBadge } from "@/components/business/status-badge";
import {
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUS_TONES,
} from "@/components/business/status-tone";
import { QuotationStatusActions } from "@/components/business/quotation-status-actions";
import { PageHeader } from "@/components/shell/page-header";
import {
  DocumentFormPreviewAside,
  DocumentFormPreviewLayout,
  DocumentFormPreviewMain,
  DocumentPreviewPageShell,
} from "@/components/shell/document-form-preview-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import { formatQuantity } from "@/modules/inventory";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import {
  buildQuotationDocumentView,
  getQuotation,
  QuotationNotFoundError,
} from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { businessLogoUrl } from "@/modules/tenant";

const audit = createPrismaAuditRepository(prisma);

export default async function QuotationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; locked?: string }>;
}) {
  const tenant = await authorize("quotation:read");
  const { id } = await params;
  const query = await searchParams;
  const canUpdate = roleHasPermission(tenant.membership.role, "quotation:update");
  const canCancel = roleHasPermission(tenant.membership.role, "quotation:cancel");
  const canRead = roleHasPermission(tenant.membership.role, "quotation:read");

  let quotation;
  try {
    quotation = await getQuotation({
      tenantId: tenant.tenantId,
      quotationId: id,
      sales: prismaSalesRepository,
    });
  } catch (error) {
    if (error instanceof QuotationNotFoundError) {
      notFound();
    }
    throw error;
  }

  const placeOfSupply =
    GST_STATE_CODES[quotation.placeOfSupplyStateCode] ??
    quotation.placeOfSupplyStateCode;
  const customer = await prismaPartyRepository.findCustomerById(
    tenant.tenantId,
    quotation.customerId
  );
  const convertedInvoice = await prismaSalesRepository.findInvoiceByQuotationId(
    tenant.tenantId,
    quotation.id
  );
  const convertedOrder = await prismaSalesRepository.findSalesOrderByQuotationId(
    tenant.tenantId,
    quotation.id
  );
  const documentView = buildQuotationDocumentView({
    number: quotation.number,
    issuedOn: quotation.issuedOn,
    validUntil: quotation.validUntil,
    notes: quotation.notes,
    placeOfSupplyStateCode: quotation.placeOfSupplyStateCode,
    seller: tenant.business,
    buyer: customer,
    logoUrl: businessLogoUrl(tenant.business.logoDocumentId),
    prepared: quotation,
  });
  const activity = await audit.listForResource({
    tenantId: tenant.tenantId,
    resource: "quotation",
    resourceId: quotation.id,
  });

  return (
    <DocumentPreviewPageShell>
      <PageHeader
        title={quotation.number}
        description={
          customer ? (
            <Link
              href={`/app/sales/customers/${quotation.customerId}`}
              className="font-medium text-foreground hover:underline"
            >
              {quotation.customerName}
            </Link>
          ) : (
            quotation.customerName
          )
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge tone={QUOTATION_STATUS_TONES[quotation.status]}>
              {QUOTATION_STATUS_LABELS[quotation.status]}
            </StatusBadge>
            {canUpdate && quotation.status === "DRAFT" ? (
              <Button
                nativeButton={false}
                render={
                  <Link href={`/app/sales/quotations/${quotation.id}/edit`} />
                }
              >
                Edit
              </Button>
            ) : null}
            <QuotationStatusActions
              quotationId={quotation.id}
              status={quotation.status}
              canUpdate={canUpdate}
              canCancel={canCancel}
              canRead={canRead}
              moreItems={[
                {
                  href: "/app/sales/quotations",
                  label: "Back to quotations",
                },
              ]}
            />
          </div>
        }
      />

      {query.locked ? (
        <p className="text-base text-muted-foreground">
          Only draft quotations can be edited.
        </p>
      ) : null}

      <DocumentFormPreviewLayout className="gap-8">
        <DocumentFormPreviewMain className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>GST breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <GstBreakdown
                  taxableAmount={quotation.taxableAmount}
                  cgst={quotation.cgst}
                  sgst={quotation.sgst}
                  igst={quotation.igst}
                  totalTax={quotation.totalTax}
                  grandTotal={quotation.grandTotal}
                  supplyType={quotation.supplyType}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-base">
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status </span>
                  {QUOTATION_STATUS_LABELS[quotation.status]}
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date </span>
                  {formatDisplayDate(quotation.issuedOn)}
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valid until </span>
                  {quotation.validUntil
                    ? formatDisplayDate(quotation.validUntil)
                    : "—"}
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Place of supply{" "}
                  </span>
                  {placeOfSupply}
                </p>
                {convertedOrder ? (
                  <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Converted order{" "}
                    </span>
                    <Link
                      href={`/app/sales/orders/${convertedOrder.id}`}
                      className="font-medium hover:underline"
                    >
                      {convertedOrder.number}
                    </Link>
                  </p>
                ) : null}
                {convertedInvoice ? (
                  <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Converted invoice{" "}
                    </span>
                    <Link
                      href={`/app/sales/invoices/${convertedInvoice.id}`}
                      className="font-medium hover:underline"
                    >
                      {convertedInvoice.number}
                    </Link>
                  </p>
                ) : null}
                {quotation.notes ? <p>{quotation.notes}</p> : null}
              </CardContent>
            </Card>
          </div>

          <Card className="p-0">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Tax rate</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <p className="font-medium">{line.productName}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {line.sku}
                          {line.hsnSac ? ` · HSN ${line.hsnSac}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQuantity(line.quantity)} {line.unitOfMeasurement}
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay value={line.unitPrice} />
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay value={line.discount} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(line.taxRateBps / 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay value={line.totalTax} />
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay value={line.lineTotal} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </DocumentFormPreviewMain>

        <DocumentFormPreviewAside className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Preview
            </p>
            <div className="max-h-[min(70vh,36rem)] overflow-auto rounded-xl bg-muted/40 p-2">
              <QuotationDocumentPreview view={documentView} />
            </div>
          </div>
          <EntityActivityPanel
            records={activity}
            timezone={tenant.business.timezone}
            emptyMessage="Quotation events will appear here after create, update, send, accept, convert, or cancel."
          />
        </DocumentFormPreviewAside>
      </DocumentFormPreviewLayout>
    </DocumentPreviewPageShell>
  );
}
