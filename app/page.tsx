import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PublicHeader } from "@/components/shell/public-header";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/app");
  }

  return (
    <>
      <PublicHeader />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">AI Business OS</h1>
        <p className="text-base text-muted-foreground">
          Sign in to access your business workspace.
        </p>
      </div>
    </>
  );
}
