import { Show } from "@clerk/nextjs";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-medium">AI Business OS</h1>
      <Show
        when="signed-out"
        fallback={
          <Button nativeButton={false} render={<Link href="/app" />}>
            Open application
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          Sign in to access your business workspace.
        </p>
      </Show>
    </div>
  );
}
