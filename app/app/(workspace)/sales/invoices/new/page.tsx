import Link from "next/link";

import { InvoiceForm } from "@/components/business/invoice-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import { toMajorString } from "@/modules/shared-kernel/money";
import { listCustomers } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { listProducts } from "@/modules/catalog";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";

export default async function NewInvoicePage() {
  const tenant = await authorize("invoice:create");
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="New invoice"
        description="GST is calculated by the tax engine when you save. Post the invoice to reduce stock and update accounts."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/sales/invoices" />}
          >
            Back to invoices
          </Button>
        }
      />
      {customers.length === 0 || products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-8 text-base">
            <p>
              {customers.length === 0
                ? "Add an active customer before creating an invoice."
                : "Add a product or service before creating an invoice."}
            </p>
            <div>
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={
                      customers.length === 0
                        ? "/app/sales/customers/new"
                        : "/app/inventory/products/new"
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
        <Card>
          <CardContent>
            <InvoiceForm
              today={todayInTimezone(tenant.business.timezone)}
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
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
