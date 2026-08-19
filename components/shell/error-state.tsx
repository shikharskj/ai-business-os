"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  retry,
}: {
  title?: string;
  description?: string;
  retry?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-md border border-border bg-card p-10 text-center">
      <div className="rounded-full border border-destructive/20 bg-destructive/5 p-4">
        <AlertCircle className="size-10 text-destructive" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="max-w-sm text-base text-muted-foreground">{description}</p>
      </div>
      {retry ? (
        <Button variant="outline" onClick={retry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
