import { OrganizationSwitcher } from "@clerk/nextjs";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Button nativeButton={false} variant="ghost" render={<Link href="/app" />}>
              Dashboard
            </Button>
            <Button
              nativeButton={false}
              variant="ghost"
              render={<Link href="/app/settings" />}
            >
              Settings
            </Button>
          </nav>
          <OrganizationSwitcher hidePersonal />
        </div>
      </div>
      {children}
    </div>
  );
}
