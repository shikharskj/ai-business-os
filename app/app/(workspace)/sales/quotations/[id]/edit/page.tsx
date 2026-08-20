import Link from "next/link";
import { notFound } from "next/navigation";

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
import { getQuotation, QuotationNotFoundError } from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("quotation:update");
  const { id } = await params;

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

  if (quotation.status !== "DRAFT") {
    notFound();
  }

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
        title={`Edit ${quotation.number}`}
        description="Saving recalculates GST through the tax engine."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/app/sales/quotations/${quotation.id}`} />}
          >
            Back
          </Button>
        }
      />
      <Card>
        <CardContent>
          <QuotationForm
            quotation={quotation}
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
    </div>
  );
}
