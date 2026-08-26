import Link from "next/link";

import { SalesOrderForm } from "@/components/business/sales-order-form";
import { PageHeader } from "@/components/shell/page-header";
import { DocumentPreviewPageShell } from "@/components/shell/document-form-preview-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildEntityCreateHref,
  parseInitialLineIndex,
  resolveInitialEntityId,
} from "@/lib/navigation/entity-create-return";
import { authorize } from "@/lib/security";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import { toMajorString } from "@/modules/shared-kernel/money";
import { listCustomers } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { listProducts } from "@/modules/catalog";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";

export default async function NewSalesOrderPage({
  searchParams,
}: {
  searchParams: Promise<{
    customerId?: string;
    productId?: string;
    lineIndex?: string;
  }>;
}) {
  const tenant = await authorize("sales-order:create");
  const params = await searchParams;
  const [customers, products] = await Promise.all([
    listCustomers({
      tenantId: tenant.tenantId,
      status: "ACTIVE",
      parties: prismaPartyRepository,
    }),
    listProducts({
      tenantId: tenant.tenantId,
      catalog: prismaCatalogRepository,
    }),
  ]);
  const initialCustomerId = resolveInitialEntityId(customers, params.customerId);
  const initialProductId =
    params.productId && products.some((product) => product.id === params.productId)
      ? params.productId
      : undefined;
  const initialLineIndex = parseInitialLineIndex(params.lineIndex);

  return (
    <DocumentPreviewPageShell>
      <PageHeader
        title="New sales order"
        description="GST is calculated by the tax engine when you save. Confirming an order does not reduce stock or post accounts."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/sales/orders" />}
          >
            Back to orders
          </Button>
        }
      />
      {customers.length === 0 || products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-8 text-base">
            <p>
              {customers.length === 0
                ? "Add an active customer before creating a sales order."
                : "Add a product or service before creating a sales order."}
            </p>
            <div>
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={
                      customers.length === 0
                        ? buildEntityCreateHref({
                            entity: "customer",
                            returnTo: "/app/sales/orders/new",
                          })
                        : buildEntityCreateHref({
                            entity: "product",
                            returnTo: "/app/sales/orders/new",
                            preserveQuery: initialCustomerId
                              ? { customerId: initialCustomerId }
                              : undefined,
                          })
                    }
                  />
                }
              >
                {customers.length === 0 ? "New customer" : "New product"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <SalesOrderForm
          today={todayInTimezone(tenant.business.timezone)}
          initialCustomerId={initialCustomerId}
          initialProductId={initialProductId}
          initialLineIndex={initialLineIndex}
          customers={customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            gstin: customer.gstin,
            state: customer.state,
          }))}
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            unitOfMeasurement: product.unitOfMeasurement,
            sellingPriceMajor: toMajorString(product.sellingPrice),
            hsnSac: product.hsnSac,
          }))}
        />
      )}
    </DocumentPreviewPageShell>
  );
}
