import Link from "next/link";
import { notFound } from "next/navigation";

import { BillForm } from "@/components/business/bill-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import { toMajorString } from "@/modules/shared-kernel/money";
import { listSuppliers } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { listProducts } from "@/modules/catalog";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { getPurchase, PurchaseNotFoundError } from "@/modules/purchases";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import { stateCodeFromName } from "@/modules/tax/domain/gstin";

export default async function EditBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("purchase:update");
  const { id } = await params;

  let purchase;
  try {
    purchase = await getPurchase({
      tenantId: tenant.tenantId,
      purchaseId: id,
      purchases: prismaPurchasesRepository,
    });
  } catch (error) {
    if (error instanceof PurchaseNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (purchase.status !== "DRAFT") {
    notFound();
  }

  const [suppliers, products] = await Promise.all([
    listSuppliers({
      tenantId: tenant.tenantId,
      status: "ACTIVE",
      parties: prismaPartyRepository,
    }),
    listProducts({
      tenantId: tenant.tenantId,
      catalog: prismaCatalogRepository,
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title={`Edit ${purchase.number}`}
        description="Saving recalculates GST through the tax engine. Only draft bills can be edited."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/app/purchases/bills/${purchase.id}`} />}
          >
            Back
          </Button>
        }
      />
      <Card>
        <CardContent>
          <BillForm
            purchase={purchase}
            today={todayInTimezone(tenant.business.timezone)}
            businessPlaceOfSupplyStateCode={
              stateCodeFromName(tenant.business.state) ?? ""
            }
            suppliers={suppliers.map((supplier) => ({
              id: supplier.id,
              name: supplier.name,
              gstin: supplier.gstin,
              state: supplier.state,
            }))}
            products={products.map((product) => ({
              id: product.id,
              name: product.name,
              sku: product.sku,
              unitOfMeasurement: product.unitOfMeasurement,
              purchasePriceMajor: toMajorString(product.purchasePrice),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
