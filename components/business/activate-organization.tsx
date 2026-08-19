"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";

import type { ActionState } from "@/app/app/actions";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 600;

export function ActivateOrganization({
  clerkOrganizationId,
}: {
  clerkOrganizationId: string;
}) {
  const router = useRouter();
  const { setActive, loaded } = useClerk();
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const activate = useCallback(async () => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        await user?.reload();
        await setActive({ organization: clerkOrganizationId });
        router.replace("/app");
        router.refresh();
        return;
      } catch {
        if (i === MAX_RETRIES - 1) {
          setError("Could not activate the organization. Please refresh the page.");
          return;
        }
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }, [clerkOrganizationId, router, setActive, user]);

  useEffect(() => {
    if (!loaded || !user) return;
    void activate();
  }, [loaded, user, activate]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <p className="text-sm text-muted-foreground">
      Activating your business workspace…
    </p>
  );
}

export function CreateBusinessSuccess({
  state,
}: {
  state: ActionState;
}) {
  if (!state.clerkOrganizationId) {
    return null;
  }

  return <ActivateOrganization clerkOrganizationId={state.clerkOrganizationId} />;
}
