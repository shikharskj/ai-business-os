import Link from "next/link";
import { notFound } from "next/navigation";

import { EditCustomerForm } from "@/components/business/edit-customer-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { getCustomer, PartyNotFoundError } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("customer:update");
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomer({
      tenantId: tenant.tenantId,
      customerId: id,
      parties: prismaPartyRepository,
    });
  } catch (error) {
    if (error instanceof PartyNotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <PageHeader
        title={`Edit ${customer.name}`}
        description="Update customer contact, address, and GST details."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/app/sales/customers/${customer.id}`} />}
          >
            Cancel
          </Button>
        }
      />
      <Card>
        <CardContent>
          <EditCustomerForm customer={customer} />
        </CardContent>
      </Card>
    </div>
  );
}
