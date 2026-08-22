import Link from "next/link";

import { InviteMemberForm } from "@/components/business/invite-member-form";
import { MembersTable } from "@/components/business/members-table";
import { PendingInvitationsList } from "@/components/business/pending-invitations-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { clerkOrganizationGateway } from "@/lib/tenant/clerk-gateways";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listOrganizationMembers } from "@/modules/tenant/application/list-organization-members";
import { prismaMembershipRepository } from "@/modules/tenant/infrastructure/prisma-repositories";

export default async function BusinessMembersPage() {
  const tenant = await authorize("settings:read");
  const user = await requireCurrentUser();
  const canInvite = roleHasPermission(
    tenant.membership.role,
    "settings:update"
  );
  const canAssignRoles = roleHasPermission(
    tenant.membership.role,
    "settings:role:assign"
  );
  const snapshot = await listOrganizationMembers({
    tenantId: tenant.tenantId,
    clerkOrganizationId: tenant.business.clerkOrganizationId,
    memberships: prismaMembershipRepository,
    clerkOrganization: clerkOrganizationGateway,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
      <PageHeader
        title="Team members"
        description={`People with access to ${tenant.business.name}. Invitations are sent through Clerk Organizations.`}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/settings" />}
          >
            Back to settings
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Current members</CardTitle>
        </CardHeader>
        <CardContent>
          <MembersTable
            members={snapshot.members}
            currentUserId={user.id}
            canAssignRoles={canAssignRoles}
          />
        </CardContent>
      </Card>

      <PendingInvitationsList invitations={snapshot.pendingInvitations} />

      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite a colleague</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Admin</span> —
                full operational access including settings (not role assignment).
              </p>
              <p>
                <span className="font-medium text-foreground">Staff</span> —
                day-to-day sales, purchases, and expenses.
              </p>
              <p>
                <span className="font-medium text-foreground">Accountant</span>{" "}
                — read-mostly access plus accounting post and reports.
              </p>
            </div>
            <InviteMemberForm />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
