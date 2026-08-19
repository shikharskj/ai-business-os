import Link from "next/link";
import { redirect } from "next/navigation";

import { InviteMemberForm } from "@/components/business/invite-member-form";
import { Button } from "@/components/ui/button";
import { authorize } from "@/lib/security";

export default async function BusinessMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string }>;
}) {
  let tenant;

  try {
    tenant = await authorize("settings:update");
  } catch {
    redirect("/app/setup");
  }

  const params = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-medium">Team members</h1>
          <p className="text-sm text-muted-foreground">
            Invite colleagues to {tenant.business.name}. Invitations are sent
            through Clerk Organizations.
          </p>
        </div>
        <Button nativeButton={false} variant="outline" render={<Link href="/app/settings" />}>
          Back to settings
        </Button>
      </div>

      {params.invited ? (
        <p className="text-sm text-muted-foreground">Invitation sent.</p>
      ) : null}

      <InviteMemberForm />
    </div>
  );
}
