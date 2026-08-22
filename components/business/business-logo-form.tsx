"use client";

import { useActionState } from "react";

import {
  removeBusinessLogoAction,
  uploadBusinessLogoAction,
  type DocumentActionState,
} from "@/app/app/(workspace)/settings/documents/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";

const initialState: DocumentActionState = {};

export function BusinessLogoForm({
  logoUrl,
  readOnly = false,
}: {
  logoUrl: string | null;
  readOnly?: boolean;
}) {
  const [uploadState, uploadAction, isUploading] = useActionState(
    uploadBusinessLogoAction,
    initialState
  );
  const [removeState, removeAction, isRemoving] = useActionState(
    async (_prev: DocumentActionState, _formData: FormData) =>
      removeBusinessLogoAction(),
    initialState
  );

  const error = uploadState.error ?? removeState.error;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="Business logo"
            className="size-16 rounded-md border border-border bg-white object-contain p-1"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            No logo
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Used on tax invoices. JPEG, PNG, or WebP, up to 2 MB.
        </p>
      </div>

      {!readOnly ? (
        <>
          <form action={uploadAction} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="logo-file" className="text-base font-medium">
                Logo image
              </label>
              <Input
                id="logo-file"
                name="file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                required
              />
            </div>
            {error ? (
              <p className="text-base text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <SubmitButton
                pending={isUploading}
                pendingLabel="Uploading"
                disabled={isRemoving}
              >
                {logoUrl ? "Replace logo" : "Upload logo"}
              </SubmitButton>
            </div>
          </form>

          {logoUrl ? (
            <form action={removeAction}>
              <SubmitButton
                pending={isRemoving}
                pendingLabel="Removing"
                variant="outline"
                disabled={isUploading}
              >
                Remove logo
              </SubmitButton>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
