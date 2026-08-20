import Link from "next/link";

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

export default async function NewBillPage() {
  const tenant = await authorize("purchase:create");
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
        title="New bill"
        description="GST is calculated by the tax engine when you save. Post the bill to increase stock and update payables."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/purchases/bills" />}
          >
            Back to bills
          </Button>
        }
      />
      {suppliers.length === 0 || products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-8 text-base">
            <p>
              {suppliers.length === 0
                ? "Add an active supplier before creating a bill."
                : "Add a product or service before creating a bill."}
            </p>
            <div>
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={
                      suppliers.length === 0
                        ? "/app/purchases/suppliers/new"
                        : "/app/inventory/products/new"
                    }
                  />
                }
              >
                {suppliers.length === 0 ? "New supplier" : "New product"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <BillForm
              today={todayInTimezone(tenant.business.timezone)}
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
      )}
    </div>
  );
}
