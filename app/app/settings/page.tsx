import Link from "next/link";
import { redirect } from "next/navigation";

import { EditBusinessProfileForm } from "@/components/business/edit-business-profile-form";
import { Button } from "@/components/ui/button";
import { authorize } from "@/lib/security";

export default async function BusinessSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
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
          <h1 className="text-xl font-medium">Business settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your business profile, tax details, and financial year
            configuration.
          </p>
        </div>
        <Button nativeButton={false} variant="outline" render={<Link href="/app/settings/members" />}>
          Members
        </Button>
      </div>

      {params.saved ? (
        <p className="text-sm text-muted-foreground">Business profile saved.</p>
      ) : null}

      <EditBusinessProfileForm business={tenant.business} />
    </div>
  );
}
