import { redirect } from "next/navigation";

import { CreateBusinessForm } from "@/components/business/create-business-form";
import { AuthChrome } from "@/components/shell/auth-chrome";
import { OfhikosCredit } from "@/components/shell/ofhikos-credit";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentTenant } from "@/lib/tenant";

export default async function BusinessSetupPage() {
  const tenant = await getCurrentTenant();

  if (tenant) {
    redirect("/app");
  }

  return (
    <>
      <AuthChrome />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set up your business
          </h1>
          <p className="text-base text-muted-foreground">
            Create your business workspace. This creates a Clerk Organization and
            links it to your application business profile.
          </p>
        </div>
        <Card>
          <CardContent>
            <CreateBusinessForm />
          </CardContent>
        </Card>
        <OfhikosCredit className="pb-2" />
      </div>
    </>
  );
}
