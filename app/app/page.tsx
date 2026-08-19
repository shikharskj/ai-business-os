import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requireCurrentTenant } from "@/lib/tenant";

export default async function AppHomePage() {
  let tenant;

  try {
    tenant = await requireCurrentTenant();
  } catch {
    redirect("/app/setup");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-medium">{tenant.business.name}</h1>
          <p className="text-sm text-muted-foreground">
            Tenant-scoped workspace for {tenant.business.type.replaceAll("_", " ").toLowerCase()}.
          </p>
        </div>
        <Button nativeButton={false} variant="outline" render={<Link href="/app/settings" />}>
          Settings
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-background p-4 text-sm">
        <dl className="grid gap-3">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Tenant ID</dt>
            <dd className="font-mono text-xs">{tenant.tenantId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">GSTIN</dt>
            <dd>{tenant.business.gstin ?? "Not registered"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Financial year starts</dt>
            <dd>Month {tenant.business.financialYearStartMonth}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Your role</dt>
            <dd>{tenant.membership.role}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
