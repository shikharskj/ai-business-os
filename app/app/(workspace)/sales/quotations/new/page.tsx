import Link from "next/link";

import { QuotationForm } from "@/components/business/quotation-form";
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
import { businessLogoUrl } from "@/modules/tenant";

export default async function NewQuotationPage() {
  const tenant = await authorize("quotation:create");
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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="New quotation"
        description="GST is calculated by the tax engine when you save. Quotations do not reduce stock or post accounts."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/sales/quotations" />}
          >
            Back to quotations
          </Button>
        }
      />
      {customers.length === 0 || products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-8 text-base">
            <p>
              {customers.length === 0
                ? "Add an active customer before creating a quotation."
                : "Add a product or service before creating a quotation."}
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
        <QuotationForm
          today={todayInTimezone(tenant.business.timezone)}
          seller={tenant.business}
          logoUrl={businessLogoUrl(tenant.business.logoDocumentId)}
          customers={customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            gstin: customer.gstin,
            phone: customer.phone,
            email: customer.email,
            billingAddressLine1: customer.billingAddressLine1,
            billingAddressLine2: customer.billingAddressLine2,
            city: customer.city,
            state: customer.state,
            postalCode: customer.postalCode,
            country: customer.country,
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
    </div>
  );
}
