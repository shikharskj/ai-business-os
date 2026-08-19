import { redirect } from "next/navigation";

import { CreateBusinessForm } from "@/components/business/create-business-form";
import { getCurrentTenant } from "@/lib/tenant";

export default async function BusinessSetupPage() {
  const tenant = await getCurrentTenant();

  if (tenant) {
    redirect("/app");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-medium">Set up your business</h1>
        <p className="text-sm text-muted-foreground">
          Create your business workspace. This creates a Clerk Organization and
          links it to your application business profile.
        </p>
      </div>
      <CreateBusinessForm />
    </div>
  );
}
