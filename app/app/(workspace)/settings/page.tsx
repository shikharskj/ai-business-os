import Link from "next/link";

import { AutonomyPolicyForm } from "@/components/business/autonomy-policy-form";
import { AutomationRunHistory } from "@/components/business/automation-run-history";
import { BusinessLogoForm } from "@/components/business/business-logo-form";
import { EditBusinessProfileForm } from "@/components/business/edit-business-profile-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import { businessLogoUrl, getAutonomyPolicy } from "@/modules/tenant";
import { prismaAutonomyPolicyRepository } from "@/modules/tenant/infrastructure/prisma-autonomy-policy-repository";
import { listRecentWorkflowRuns, toWorkflowRunView } from "@/modules/workflows";
import { prismaWorkflowRunRepository } from "@/modules/workflows/infrastructure/prisma-workflow-run-repository";

export default async function BusinessSettingsPage() {
  const tenant = await authorize("settings:read");
  const canUpdate = roleHasPermission(
    tenant.membership.role,
    "settings:update"
  );
  const canReadDocuments = roleHasPermission(
    tenant.membership.role,
    "document:read"
  );
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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Business settings"
        description="Manage your business profile, tax details, and financial year configuration."
        actions={
          <div className="flex gap-2">
            {canReadDocuments ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href="/app/settings/documents" />}
              >
                Documents
              </Button>
            ) : null}
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
            <CardDescription>
              Legal identity, contact details, GST registration, and financial
              defaults for this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditBusinessProfileForm
              business={tenant.business}
              readOnly={!canUpdate}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice logo</CardTitle>
            </CardHeader>
            <CardContent>
              <BusinessLogoForm
                logoUrl={businessLogoUrl(tenant.business.logoDocumentId)}
                readOnly={!canUpdate}
              />
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
              <AutonomyPolicyForm
                policy={autonomyPolicy}
                readOnly={!canUpdate}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent automations</CardTitle>
              <CardDescription>
                Collection reminders and runtime checks. Nothing here posts
                invoices or stock on its own.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AutomationRunHistory runs={automationRuns} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
