"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deactivateCustomerAction } from "@/app/app/(workspace)/sales/customers/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";

export function DeactivateCustomerButton({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
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
              `Deactivate ${customerName}? They will no longer appear in the active customer list. This can be reviewed later; invoices are not deleted.`
            )
          ) {
            return;
          }

          startTransition(async () => {
            setError(null);
            const result = await deactivateCustomerAction(customerId);
            if (result.error) {
              setError(result.error);
              notifyError("Could not deactivate customer", result.error);
              return;
            }
            notifySuccess("Customer deactivated", `${customerName} is no longer active.`);
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
