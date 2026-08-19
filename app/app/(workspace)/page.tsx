import { requireCurrentTenant } from "@/lib/tenant/current-tenant";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const tenant = await requireCurrentTenant();

  const facts = [
    {
      title: "Business type",
      value: tenant.business.type.replaceAll("_", " "),
      caption: tenant.business.name,
    },
    {
      title: "GSTIN",
      value: tenant.business.gstin ?? "Not registered",
      caption: tenant.business.gstin
        ? "GST identification number"
        : "Add GSTIN in settings when you register",
    },
    {
      title: "Financial year starts",
      value: `Month ${tenant.business.financialYearStartMonth}`,
      caption: "Used for reports and accounting periods",
    },
    {
      title: "Your role",
      value: tenant.membership.role,
      caption: "Workspace access for this account",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`Overview of ${tenant.business.name}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {facts.map((fact) => (
          <Card key={fact.title} size="sm">
            <CardHeader>
              <CardDescription>{fact.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {fact.value}
              </CardTitle>
              <CardDescription>{fact.caption}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
