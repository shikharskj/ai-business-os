"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

import { WorkspaceCommandMenu } from "@/components/shell/workspace-command-menu";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppTopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-14 min-w-0 shrink-0 items-center gap-2 overflow-x-hidden border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1 shrink-0" />
      <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {children}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <WorkspaceCommandMenu />
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/app"
          afterCreateOrganizationUrl="/app/setup"
          appearance={{
            elements: {
              rootBox: "flex max-w-[10rem] items-center sm:max-w-[14rem]",
              organizationSwitcherTrigger:
                "max-w-full truncate rounded-md border border-border bg-background px-2 py-1.5 text-sm",
              organizationPreviewTextContainer: "max-w-[7rem] truncate sm:max-w-[11rem]",
              organizationPreviewMainIdentifier: "truncate",
            },
          }}
        />
        <ThemeToggle />
        <UserButton />
      </div>
    </header>
  );
}
