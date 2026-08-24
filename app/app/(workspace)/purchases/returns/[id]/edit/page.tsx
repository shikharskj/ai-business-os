import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PurchaseReturnForm } from "@/components/business/purchase-return-form";
import { PageHeader } from "@/components/shell/page-header";
import { DocumentPreviewPageShell } from "@/components/shell/document-form-preview-layout";
import { Button } from "@/components/ui/button";
import { authorize } from "@/lib/security";
import {
  PurchaseReturnNotFoundError,
  getPurchase,
  getPurchaseReturn,
} from "@/modules/purchases";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import {
  quantity,
  subtractQuantity,
  toQuantityMajorString,
} from "@/modules/inventory/domain/quantity";

export default async function EditPurchaseReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("purchase:update");
  const { id } = await params;

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

  if (purchaseReturn.status !== "DRAFT") {
    redirect(`/app/purchases/returns/${purchaseReturn.id}`);
  }

  const purchase = await getPurchase({
    tenantId: tenant.tenantId,
    purchaseId: purchaseReturn.purchaseId,
    purchases: prismaPurchasesRepository,
  });
  const returned = await prismaPurchasesRepository.returnedQuantityByPurchaseLine({
    tenantId: tenant.tenantId,
    purchaseId: purchase.id,
    excludePurchaseReturnId: purchaseReturn.id,
  });
  const billOption = {
    id: purchase.id,
    number: purchase.number,
    supplierName: purchase.supplierName,
    issuedOn: purchase.issuedOn,
    lines: purchase.lines
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

  return (
    <DocumentPreviewPageShell>
      <PageHeader
        title={`Edit ${purchaseReturn.number}`}
        description="GST is recalculated when you save."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/app/purchases/returns/${purchaseReturn.id}`} />}
          >
            Back
          </Button>
        }
      />
      <PurchaseReturnForm
        today={todayInTimezone(tenant.business.timezone)}
        bills={[billOption]}
        purchaseReturn={purchaseReturn}
        lockPurchase
      />
    </DocumentPreviewPageShell>
  );
}
