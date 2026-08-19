import { requireCurrentTenant } from "@/lib/tenant/current-tenant";
import { PageHeader } from "@/components/shell/page-header";

export default async function DashboardPage() {
  const tenant = await requireCurrentTenant();

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Dashboard"
        description={`Overview of ${tenant.business.name}`}
      />

      <div className="rounded-lg border border-border bg-background p-4 text-sm">
        <dl className="grid gap-3">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Business type</dt>
            <dd>
              {tenant.business.type.replaceAll("_", " ").toLowerCase()}
            </dd>
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
