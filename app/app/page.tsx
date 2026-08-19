import { requireCurrentUser } from "@/lib/auth";

export default async function AppHomePage() {
  const user = await requireCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 p-6">
      <h1 className="text-xl font-medium">Application</h1>
      <p className="text-sm text-muted-foreground">
        You are signed in. Server-side identity resolved to application user{" "}
        <span className="font-medium text-foreground">{user.id}</span>.
      </p>
    </div>
  );
}
