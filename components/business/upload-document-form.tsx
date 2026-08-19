"use client";

import { useActionState } from "react";

import {
  uploadBusinessDocumentAction,
  type DocumentActionState,
} from "@/app/app/(workspace)/settings/documents/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: DocumentActionState = {};

export function UploadDocumentForm() {
  const [state, formAction, isPending] = useActionState(
    uploadBusinessDocumentAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="file" className="text-base font-medium">
          Supporting file
        </label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          required
        />
        <p className="text-xs text-muted-foreground">
          PDF, JPEG, PNG, or WebP. Maximum 10 MB. Files are stored as evidence
          and are never executed.
        </p>
      </div>

      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Uploading..." : "Upload document"}
      </Button>
    </form>
  );
}
