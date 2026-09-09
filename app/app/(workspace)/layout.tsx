import { redirect } from "next/navigation";

import { requireCurrentTenant } from "@/lib/tenant/current-tenant";
import {
  TenantMembershipUnavailableError,
  TenantRequiredError,
} from "@/modules/tenant/domain/errors";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppFeedbackProvider } from "@/components/shell/app-feedback-provider";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopBar } from "@/components/shell/app-top-bar";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let tenant;

  try {
    tenant = await requireCurrentTenant();
  } catch (error) {
    if (
      error instanceof TenantRequiredError ||
      error instanceof TenantMembershipUnavailableError
    ) {
      redirect("/app/setup");
    }
    throw error;
  }

  return (
    <AppFeedbackProvider>
      <SidebarProvider className="h-svh max-h-svh overflow-hidden">
        <AppSidebar
          businessName={tenant.business.name}
          role={tenant.membership.role}
        />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <AppTopBar role={tenant.membership.role} />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AppFeedbackProvider>
  );
}
