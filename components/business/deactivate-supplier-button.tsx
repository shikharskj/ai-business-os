"use client";

import { useState, useTransition } from "react";

import { deactivateSupplierAction } from "@/app/app/(workspace)/purchases/suppliers/actions";
import { Button } from "@/components/ui/button";

export function DeactivateSupplierButton({
  supplierId,
  supplierName,
}: {
  supplierId: string;
  supplierName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="destructive"
        disabled={isPending}
        onClick={() => {
          if (
            !window.confirm(
              `Deactivate ${supplierName}? They will no longer appear in the active supplier list. This can be reviewed later; bills are not deleted.`
            )
          ) {
            return;
          }

          startTransition(async () => {
            setError(null);
            const result = await deactivateSupplierAction(supplierId);
            if (result.error) {
              setError(result.error);
            }
          });
        }}
      >
        {isPending ? "Deactivating…" : "Deactivate"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
