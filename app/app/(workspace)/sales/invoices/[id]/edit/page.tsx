import Link from "next/link";
import { notFound } from "next/navigation";

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
import { getInvoice, InvoiceNotFoundError } from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("invoice:update");
  const { id } = await params;

  let invoice;
  try {
    invoice = await getInvoice({
      tenantId: tenant.tenantId,
      invoiceId: id,
      sales: prismaSalesRepository,
    });
  } catch (error) {
    if (error instanceof InvoiceNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (invoice.status !== "DRAFT") {
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
        title={`Edit ${invoice.number}`}
        description="Saving recalculates GST through the tax engine. Only draft invoices can be edited."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/app/sales/invoices/${invoice.id}`} />}
          >
            Back
          </Button>
        }
      />
      <Card>
        <CardContent>
          <InvoiceForm
            invoice={invoice}
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
