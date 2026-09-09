"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shell/error-state";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7538/ingest/a3d20045-9ab4-4203-87e9-b51ce28a6953", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "c6ad66",
      },
      body: JSON.stringify({
        sessionId: "c6ad66",
        runId: "pre-fix",
        hypothesisId: "A-E",
        location: "app/app/(workspace)/error.tsx",
        message: "Workspace error boundary caught",
        data: {
          name: error?.name ?? null,
          errMessage: error?.message ?? null,
          digest: error?.digest ?? null,
          stack: error?.stack?.slice(0, 2000) ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [error]);
  return <ErrorState retry={reset} />;
}
