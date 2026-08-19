"use client";

import { useState, useTransition } from "react";

import { deactivateCustomerAction } from "@/app/app/(workspace)/sales/customers/actions";
import { Button } from "@/components/ui/button";

export function DeactivateCustomerButton({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
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
