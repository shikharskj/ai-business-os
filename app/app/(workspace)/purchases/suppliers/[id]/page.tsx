import Link from "next/link";
import { notFound } from "next/navigation";

import { DeactivateSupplierButton } from "@/components/business/deactivate-supplier-button";
import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import {
  PARTY_STATUS_LABELS,
  PARTY_STATUS_TONES,
} from "@/components/business/status-tone";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import { getSupplier, PartyNotFoundError } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { getSupplierOutstanding } from "@/modules/purchases";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";

function gstLabel(status: string): string {
  if (status === "REGISTERED") return "Registered";
  if (status === "COMPOSITION") return "Composition";
  return "Not registered";
}

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const tenant = await authorize("supplier:read");
  const { id } = await params;
  const query = await searchParams;
  const canUpdate = roleHasPermission(tenant.membership.role, "supplier:update");

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

  const address = [
    supplier.billingAddressLine1,
    supplier.billingAddressLine2,
    [supplier.city, supplier.state, supplier.postalCode]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  const outstanding = await getSupplierOutstanding({
    tenantId: tenant.tenantId,
    supplierId: supplier.id,
    purchases: prismaPurchasesRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
      <PageHeader
        title={supplier.name}
        description="Supplier profile"
        actions={
          <div className="flex items-center gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/purchases/suppliers" />}
            >
              Back
            </Button>
            {canUpdate && supplier.status === "ACTIVE" ? (
              <>
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={
                    <Link href={`/app/purchases/suppliers/${supplier.id}/edit`} />
                  }
                >
                  Edit
                </Button>
                <DeactivateSupplierButton
                  supplierId={supplier.id}
                  supplierName={supplier.name}
                />
              </>
            ) : null}
          </div>
        }
      />

      {query.saved ? (
        <p className="text-base text-muted-foreground">Supplier saved.</p>
      ) : null}

      <div className="flex items-center gap-2">
        <StatusBadge tone={PARTY_STATUS_TONES[supplier.status]}>
          {PARTY_STATUS_LABELS[supplier.status]}
        </StatusBadge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding payable</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <MoneyDisplay
            value={outstanding.outstanding}
            className="text-2xl font-semibold"
          />
          <p className="text-base text-muted-foreground">
            {!outstanding.hasPostedPurchases
              ? "No bills yet"
              : outstanding.openBillCount === 0
                ? "No unpaid bills"
                : `${outstanding.openBillCount} unpaid bill${outstanding.openBillCount === 1 ? "" : "s"}`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-base sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{supplier.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{supplier.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">GST registration</p>
            <p>{gstLabel(supplier.gstRegistrationStatus)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">GSTIN</p>
            <p className="font-mono text-xs">{supplier.gstin ?? "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Billing address</p>
            <p className="whitespace-pre-line">{address || "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
