import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { InvoiceForm } from "@/components/business/invoice-form";
import { PageHeader } from "@/components/shell/page-header";
import { DocumentPreviewPageShell } from "@/components/shell/document-form-preview-layout";
import { Button } from "@/components/ui/button";
import { authorize } from "@/lib/security";
import { listCustomers, getCustomer } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { listProducts } from "@/modules/catalog";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { getInvoice, InvoiceNotFoundError } from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import { toMajorString } from "@/modules/shared-kernel/money";
import { businessLogoUrl } from "@/modules/tenant";

function mapCustomerOption(customer: Awaited<ReturnType<typeof getCustomer>>) {
  return {
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
  };
}

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
    redirect(`/app/sales/invoices/${invoice.id}?locked=1`);
  }

  const [activeCustomers, invoiceCustomer, products] = await Promise.all([
    listCustomers({
      tenantId: tenant.tenantId,
      status: "ACTIVE",
      parties: prismaPartyRepository,
    }),
    prismaPartyRepository.findCustomerById(tenant.tenantId, invoice.customerId),
    listProducts({
      tenantId: tenant.tenantId,
      catalog: prismaCatalogRepository,
    }),
  ]);

  const customerMap = new Map(activeCustomers.map((customer) => [customer.id, customer]));
  if (invoiceCustomer && !customerMap.has(invoiceCustomer.id)) {
    customerMap.set(invoiceCustomer.id, invoiceCustomer);
  }
  const customers = [...customerMap.values()];

  return (
    <DocumentPreviewPageShell>
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
      <InvoiceForm
        invoice={invoice}
        today={todayInTimezone(tenant.business.timezone)}
        seller={tenant.business}
        logoUrl={businessLogoUrl(tenant.business.logoDocumentId)}
        customers={customers.map(mapCustomerOption)}
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
