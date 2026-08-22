import Link from "next/link";

import { AutonomyPolicyForm } from "@/components/business/autonomy-policy-form";
import { AutomationRunHistory } from "@/components/business/automation-run-history";
import { BusinessLogoForm } from "@/components/business/business-logo-form";
import { EditBusinessProfileForm } from "@/components/business/edit-business-profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { authorize } from "@/lib/security";
import { businessLogoUrl, getAutonomyPolicy } from "@/modules/tenant";
import { prismaAutonomyPolicyRepository } from "@/modules/tenant/infrastructure/prisma-autonomy-policy-repository";
import { listRecentWorkflowRuns, toWorkflowRunView } from "@/modules/workflows";
import { prismaWorkflowRunRepository } from "@/modules/workflows/infrastructure/prisma-workflow-run-repository";

export default async function BusinessSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const tenant = await authorize("settings:update");
  const params = await searchParams;
  const autonomyPolicy = await getAutonomyPolicy({
    tenantId: tenant.tenantId,
    policies: prismaAutonomyPolicyRepository,
  });
  const automationRuns = (
    await listRecentWorkflowRuns({
      tenantId: tenant.tenantId,
      runs: prismaWorkflowRunRepository,
      limit: 10,
    })
  ).map(toWorkflowRunView);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <PageHeader
        title="Business settings"
        description="Manage your business profile, tax details, and financial year configuration."
        actions={
          <div className="flex gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/settings/documents" />}
            >
              Documents
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/settings/members" />}
            >
              Members
            </Button>
          </div>
        }
      />

      {params.saved === "1" ? (
        <p className="text-base text-muted-foreground">Business profile saved.</p>
      ) : null}
      {params.saved === "autonomy" ? (
        <p className="text-base text-muted-foreground">Autonomy policy saved.</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Invoice logo</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessLogoForm logoUrl={businessLogoUrl(tenant.business.logoDocumentId)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Autonomy</CardTitle>
          <CardDescription>
            Control which low-risk actions may run automatically. Payment
            reminders stay Confirm-by-default until you enable a limit here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutonomyPolicyForm policy={autonomyPolicy} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent automations</CardTitle>
          <CardDescription>
            Collection reminders and runtime checks. Nothing here posts invoices
            or stock on its own. Confirm still applies unless L4 is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutomationRunHistory runs={automationRuns} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <EditBusinessProfileForm business={tenant.business} />
        </CardContent>
      </Card>
    </div>
  );
}
