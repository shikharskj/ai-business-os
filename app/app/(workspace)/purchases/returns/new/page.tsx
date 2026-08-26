import Link from "next/link";

import { PurchaseReturnForm } from "@/components/business/purchase-return-form";
import { PageHeader } from "@/components/shell/page-header";
import { DocumentPreviewPageShell } from "@/components/shell/document-form-preview-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { GST_PURCHASE_STATUSES } from "@/modules/reporting/domain/gst-types";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import {
  quantity,
  subtractQuantity,
  toQuantityMajorString,
} from "@/modules/inventory/domain/quantity";

export default async function NewPurchaseReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ purchaseId?: string }>;
}) {
  const tenant = await authorize("purchase-return:create");
  const params = await searchParams;
  const bills = await prismaPurchasesRepository.listPurchases({
    tenantId: tenant.tenantId,
    statuses: [...GST_PURCHASE_STATUSES],
  });
  const remainingByBill = await Promise.all(
    bills.map(async (bill) => {
      const returned = await prismaPurchasesRepository.returnedQuantityByPurchaseLine({
        tenantId: tenant.tenantId,
        purchaseId: bill.id,
      });
      return {
        id: bill.id,
        number: bill.number,
        supplierName: bill.supplierName,
        issuedOn: bill.issuedOn,
        lines: bill.lines
          .map((line) => {
            const remaining = subtractQuantity(
              line.quantity,
              returned.get(line.id) ?? quantity(0n)
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
  const available = remainingByBill.filter((bill) => bill.lines.length > 0);
  const initialPurchaseId =
    params.purchaseId && available.some((bill) => bill.id === params.purchaseId)
      ? params.purchaseId
      : undefined;
  const ordered = initialPurchaseId
    ? [
        available.find((bill) => bill.id === initialPurchaseId)!,
        ...available.filter((bill) => bill.id !== initialPurchaseId),
      ]
    : available;

  return (
    <DocumentPreviewPageShell>
      <PageHeader
        title="New return"
        description="Return remaining quantity from a posted bill. GST is calculated by the tax engine when you save."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/purchases/returns" />}
          >
            Back to returns
          </Button>
        }
      />
      {ordered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-8 text-base">
            <p>Post a purchase bill before issuing a return.</p>
            <div>
              <Button
                nativeButton={false}
                render={<Link href="/app/purchases/bills" />}
              >
                View bills
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PurchaseReturnForm
          today={todayInTimezone(tenant.business.timezone)}
          bills={ordered}
          lockPurchase={Boolean(initialPurchaseId)}
        />
      )}
    </DocumentPreviewPageShell>
  );
}
