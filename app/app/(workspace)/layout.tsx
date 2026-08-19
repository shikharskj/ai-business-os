import { redirect } from "next/navigation";

import { requireCurrentTenant } from "@/lib/tenant/current-tenant";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
  } catch {
    redirect("/app/setup");
  }

  return (
    <SidebarProvider>
      <AppSidebar businessName={tenant.business.name} />
      <SidebarInset>
        <AppTopBar />
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
