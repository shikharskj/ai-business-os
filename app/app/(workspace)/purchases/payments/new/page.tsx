import Link from "next/link";

import { RecordSupplierPaymentForm } from "@/components/business/record-supplier-payment-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildEntityCreateHref } from "@/lib/navigation/entity-create-return";
import { authorize } from "@/lib/security";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import { listSuppliers } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { listOpenPayablePurchases } from "@/modules/payments";
import { prismaSupplierPaymentRepository } from "@/modules/payments/infrastructure/prisma-supplier-payments-repository";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";

export default async function NewSupplierPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string; purchaseId?: string }>;
}) {
  const tenant = await authorize("payment:create");
  const params = await searchParams;
  const suppliers = await listSuppliers({
    tenantId: tenant.tenantId,
    status: "ACTIVE",
    parties: prismaPartyRepository,
  });
  const selectedSupplierId =
    params.supplierId && suppliers.some((supplier) => supplier.id === params.supplierId)
      ? params.supplierId
      : (suppliers[0]?.id ?? "");

  const purchases = selectedSupplierId
    ? await listOpenPayablePurchases({
        tenantId: tenant.tenantId,
        supplierId: selectedSupplierId,
        purchases: prismaPurchasesRepository,
        supplierPayments: prismaSupplierPaymentRepository,
      })
    : [];

  const selectedPurchaseId = purchases.some(
    (purchase) => purchase.purchaseId === params.purchaseId
  )
    ? params.purchaseId
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <PageHeader
        title="Record payment"
        description="Allocate the amount paid to unpaid purchase bills. Cash, UPI, bank transfer, card, and cheque are recorded as labels only."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/purchases/payments" />}
          >
            Back to payments
          </Button>
        }
      />
      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-8 text-base">
            <p>Add an active supplier before recording a payment.</p>
            <div>
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={buildEntityCreateHref({
                      entity: "supplier",
                      returnTo: "/app/purchases/payments/new",
                    })}
                  />
                }
              >
                New supplier
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <RecordSupplierPaymentForm
              today={todayInTimezone(tenant.business.timezone)}
              selectedSupplierId={selectedSupplierId}
              selectedPurchaseId={selectedPurchaseId}
              suppliers={suppliers.map((supplier) => ({
                id: supplier.id,
                name: supplier.name,
              }))}
              purchases={purchases}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
