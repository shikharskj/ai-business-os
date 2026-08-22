"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { reactivateCustomerAction } from "@/app/app/(workspace)/sales/customers/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";

export function ReactivateCustomerButton({
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
        variant="outline"
        pending={isPending}
        pendingLabel="Reactivating"
        onClick={() => {
          if (
            !window.confirm(
              `Reactivate ${customerName}? They will appear in the active customer list again.`
            )
          ) {
            return;
          }

          startTransition(async () => {
            setError(null);
            const result = await reactivateCustomerAction(customerId);
            if (result.error) {
              setError(result.error);
              notifyError("Could not reactivate customer", result.error);
              return;
            }
            notifySuccess("Customer reactivated", `${customerName} is active again.`);
            router.refresh();
          });
        }}
      >
        Reactivate
      </PendingButton>
      {error ? (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
