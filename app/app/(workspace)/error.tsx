"use client";

import { ErrorState } from "@/components/shell/error-state";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState retry={reset} />;
}
