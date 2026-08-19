import Link from "next/link";

import { InviteMemberForm } from "@/components/business/invite-member-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { authorize } from "@/lib/security";

export default async function BusinessMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string }>;
}) {
  const tenant = await authorize("settings:update");
  const params = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Team members"
        description={`Invite colleagues to ${tenant.business.name}. Invitations are sent through Clerk Organizations.`}
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

      {params.invited ? (
        <p className="text-sm text-muted-foreground">Invitation sent.</p>
      ) : null}

      <InviteMemberForm />
    </div>
  );
}
