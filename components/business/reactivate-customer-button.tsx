"use client";

import { useState, useTransition } from "react";

import { reactivateCustomerAction } from "@/app/app/(workspace)/sales/customers/actions";
import { Button } from "@/components/ui/button";

export function ReactivateCustomerButton({
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
        variant="outline"
        disabled={isPending}
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
            }
          });
        }}
      >
        {isPending ? "Reactivating…" : "Reactivate"}
      </Button>
      {error ? (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
