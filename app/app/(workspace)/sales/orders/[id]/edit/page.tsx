import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SalesOrderForm } from "@/components/business/sales-order-form";
import { PageHeader } from "@/components/shell/page-header";
import { DocumentPreviewPageShell } from "@/components/shell/document-form-preview-layout";
import { Button } from "@/components/ui/button";
import { authorize } from "@/lib/security";
import { listCustomers } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { listProducts } from "@/modules/catalog";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { getSalesOrder, SalesOrderNotFoundError } from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import { toMajorString } from "@/modules/shared-kernel/money";

export default async function EditSalesOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("sales-order:update");
  const { id } = await params;

  let salesOrder;
  try {
    salesOrder = await getSalesOrder({
      tenantId: tenant.tenantId,
      salesOrderId: id,
      sales: prismaSalesRepository,
    });
  } catch (error) {
    if (error instanceof SalesOrderNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (salesOrder.status !== "DRAFT") {
    redirect(`/app/sales/orders/${salesOrder.id}?locked=1`);
  }

  const [activeCustomers, orderCustomer, products] = await Promise.all([
    listCustomers({
      tenantId: tenant.tenantId,
      status: "ACTIVE",
      parties: prismaPartyRepository,
    }),
    prismaPartyRepository.findCustomerById(tenant.tenantId, salesOrder.customerId),
    listProducts({
      tenantId: tenant.tenantId,
      catalog: prismaCatalogRepository,
    }),
  ]);

  const customerMap = new Map(activeCustomers.map((customer) => [customer.id, customer]));
  if (orderCustomer && !customerMap.has(orderCustomer.id)) {
    customerMap.set(orderCustomer.id, orderCustomer);
  }

  return (
    <DocumentPreviewPageShell>
      <PageHeader
        title={`Edit ${salesOrder.number}`}
        description="Saving recalculates GST through the tax engine."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/app/sales/orders/${salesOrder.id}`} />}
          >
            Back
          </Button>
        }
      />
      <SalesOrderForm
        salesOrder={salesOrder}
        today={todayInTimezone(tenant.business.timezone)}
        customers={[...customerMap.values()].map((customer) => ({
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
    </DocumentPreviewPageShell>
  );
}
