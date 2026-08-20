import Link from "next/link";
import { notFound } from "next/navigation";

import { DeactivateCustomerButton } from "@/components/business/deactivate-customer-button";
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
import { money } from "@/modules/shared-kernel/money";
import { getCustomer, PartyNotFoundError } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";

function gstLabel(status: string): string {
  if (status === "REGISTERED") return "Registered";
  if (status === "COMPOSITION") return "Composition";
  return "Not registered";
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const tenant = await authorize("customer:read");
  const { id } = await params;
  const query = await searchParams;
  const canUpdate = roleHasPermission(tenant.membership.role, "customer:update");

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

  const address = [
    customer.billingAddressLine1,
    customer.billingAddressLine2,
    [customer.city, customer.state, customer.postalCode]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
      <PageHeader
        title={customer.name}
        description="Customer profile"
        actions={
          <div className="flex items-center gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/sales/customers" />}
            >
              Back
            </Button>
            {canUpdate && customer.status === "ACTIVE" ? (
              <>
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={<Link href={`/app/sales/customers/${customer.id}/edit`} />}
                >
                  Edit
                </Button>
                <DeactivateCustomerButton
                  customerId={customer.id}
                  customerName={customer.name}
                />
              </>
            ) : null}
          </div>
        }
      />

      {query.saved ? (
        <p className="text-base text-muted-foreground">Customer saved.</p>
      ) : null}

      <div className="flex items-center gap-2">
        <StatusBadge tone={PARTY_STATUS_TONES[customer.status]}>
          {PARTY_STATUS_LABELS[customer.status]}
        </StatusBadge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <MoneyDisplay value={money(0n)} className="text-2xl font-semibold" />
          <p className="text-base text-muted-foreground">No invoices yet</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-base sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{customer.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{customer.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">GST registration</p>
            <p>{gstLabel(customer.gstRegistrationStatus)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">GSTIN</p>
            <p className="font-mono text-xs">{customer.gstin ?? "—"}</p>
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
