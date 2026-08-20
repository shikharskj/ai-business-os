"use client";

import { useState, useTransition } from "react";

import {
  cancelPurchaseAction,
  postPurchaseAction,
} from "@/app/app/(workspace)/purchases/bills/actions";
import { Button } from "@/components/ui/button";
import type { PurchaseStatus } from "@/modules/purchases/domain/types";

export function BillStatusActions({
  purchaseId,
  status,
  canUpdate,
  canCancel,
}: {
  purchaseId: string;
  status: PurchaseStatus;
  canUpdate: boolean;
  canCancel: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    message: string | null,
    action: (id: string) => Promise<{ error?: string }>
  ) {
    if (message && !window.confirm(message)) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await action(purchaseId);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {canUpdate && status === "DRAFT" ? (
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(
                "Post this bill? Inventory-tracked items will increase and accounts payable will be updated. This cannot be undone by editing the bill.",
                postPurchaseAction
              )
            }
          >
            Post bill
          </Button>
        ) : null}
        {canCancel && status === "DRAFT" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              run(
                "Cancel this draft bill? It will remain in your list as cancelled. Stock and accounts are not affected.",
                cancelPurchaseAction
              )
            }
          >
            Cancel draft
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
