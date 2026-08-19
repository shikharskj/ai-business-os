import Link from "next/link";

import { EditBusinessProfileForm } from "@/components/business/edit-business-profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { authorize } from "@/lib/security";

export default async function BusinessSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const tenant = await authorize("settings:update");
  const params = await searchParams;

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

      {params.saved ? (
        <p className="text-base text-muted-foreground">Business profile saved.</p>
      ) : null}

      <Card>
        <CardContent>
          <EditBusinessProfileForm business={tenant.business} />
        </CardContent>
      </Card>
    </div>
  );
}
