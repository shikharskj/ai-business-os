import Link from "next/link";
import { notFound } from "next/navigation";

import { EditSupplierForm } from "@/components/business/edit-supplier-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { authorize } from "@/lib/security";
import { getSupplier, PartyNotFoundError } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("supplier:update");
  const { id } = await params;

  let supplier;
  try {
    supplier = await getSupplier({
      tenantId: tenant.tenantId,
      supplierId: id,
      parties: prismaPartyRepository,
    });
  } catch (error) {
    if (error instanceof PartyNotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <PageHeader
        title={`Edit ${supplier.name}`}
        description="Update supplier contact, address, and GST details."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/app/purchases/suppliers/${supplier.id}`} />}
          >
            Cancel
          </Button>
        }
      />
      <EditSupplierForm supplier={supplier} />
    </div>
  );
}
