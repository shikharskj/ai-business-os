"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deactivateSupplierAction } from "@/app/app/(workspace)/purchases/suppliers/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";

export function DeactivateSupplierButton({
  supplierId,
  supplierName,
}: {
  supplierId: string;
  supplierName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <PendingButton
        type="button"
        variant="destructive"
        pending={isPending}
        pendingLabel="Deactivating"
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
              notifyError("Could not deactivate supplier", result.error);
              return;
            }
            notifySuccess("Supplier deactivated", `${supplierName} is no longer active.`);
            router.refresh();
          });
        }}
      >
        Deactivate
      </PendingButton>
      {error ? (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
