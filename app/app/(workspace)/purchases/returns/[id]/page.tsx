import Link from "next/link";
import { notFound } from "next/navigation";

import { EntityActivityPanel } from "@/components/business/entity-activity-panel";
import { GstBreakdown } from "@/components/business/gst-breakdown";
import { formatDisplayDate } from "@/components/business/inventory-labels";
import { MoneyDisplay } from "@/components/business/money-display";
import { PurchaseReturnStatusActions } from "@/components/business/purchase-return-status-actions";
import { StatusBadge } from "@/components/business/status-badge";
import { PURCHASE_RETURN_STATUS_TONES } from "@/components/business/status-tone";
import { PageHeader } from "@/components/shell/page-header";
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
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import {
  PurchaseReturnNotFoundError,
  getPurchaseReturn,
  purchaseReturnStatusLabel,
} from "@/modules/purchases";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";

const audit = createPrismaAuditRepository(prisma);

export default async function PurchaseReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("purchase:read");
  const { id } = await params;
  const canUpdate = roleHasPermission(tenant.membership.role, "purchase:update");
  const canCancel = roleHasPermission(tenant.membership.role, "purchase:cancel");
  const canReadJournal = roleHasPermission(tenant.membership.role, "report:read");

  let purchaseReturn;
  try {
    purchaseReturn = await getPurchaseReturn({
      tenantId: tenant.tenantId,
      purchaseReturnId: id,
      purchases: prismaPurchasesRepository,
    });
  } catch (error) {
    if (error instanceof PurchaseReturnNotFoundError) {
      notFound();
    }
    throw error;
  }

  const placeOfSupply =
    GST_STATE_CODES[purchaseReturn.placeOfSupplyStateCode] ??
    purchaseReturn.placeOfSupplyStateCode;
  const activity = await audit.listForResource({
    tenantId: tenant.tenantId,
    resource: "purchase_return",
    resourceId: purchaseReturn.id,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title={purchaseReturn.number}
        description={purchaseReturn.supplierName}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge tone={PURCHASE_RETURN_STATUS_TONES[purchaseReturn.status]}>
              {purchaseReturnStatusLabel(purchaseReturn.status)}
            </StatusBadge>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/purchases/returns" />}
            >
              Back
            </Button>
            {canUpdate && purchaseReturn.status === "DRAFT" ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/app/purchases/returns/${purchaseReturn.id}/edit`} />}
              >
                Edit
              </Button>
            ) : null}
            <PurchaseReturnStatusActions
              purchaseReturnId={purchaseReturn.id}
              status={purchaseReturn.status}
              canUpdate={canUpdate}
              canCancel={canCancel}
            />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="p-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseReturn.lines.map((line) => (
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

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>GST breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <GstBreakdown
                taxableAmount={purchaseReturn.taxableAmount}
                cgst={purchaseReturn.cgst}
                sgst={purchaseReturn.sgst}
                igst={purchaseReturn.igst}
                totalTax={purchaseReturn.totalTax}
                grandTotal={purchaseReturn.grandTotal}
                supplyType={purchaseReturn.supplyType}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-base">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Bill </span>
                <Link
                  href={`/app/purchases/bills/${purchaseReturn.purchaseId}`}
                  className="font-medium hover:underline"
                >
                  {purchaseReturn.purchaseNumber}
                </Link>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Date </span>
                {formatDisplayDate(purchaseReturn.issuedOn)}
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Place of supply </span>
                {placeOfSupply}
              </p>
              {purchaseReturn.journalId && canReadJournal ? (
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Accounting </span>
                  <Link
                    href={`/app/accounting/journals/${purchaseReturn.journalId}`}
                    className="font-medium hover:underline"
                  >
                    View journal
                  </Link>
                </p>
              ) : null}
              {purchaseReturn.postedAt ? (
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Posted </span>
                  {purchaseReturn.postedAt.toLocaleString("en-IN", {
                    timeZone: tenant.business.timezone,
                  })}
                </p>
              ) : null}
              {purchaseReturn.notes ? <p>{purchaseReturn.notes}</p> : null}
            </CardContent>
          </Card>
          <EntityActivityPanel
            records={activity}
            timezone={tenant.business.timezone}
            emptyMessage="Return events will appear here after create, update, post, or cancel."
          />
        </div>
      </div>
    </div>
  );
}
