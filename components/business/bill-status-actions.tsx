"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelPurchaseAction,
  postPurchaseAction,
} from "@/app/app/(workspace)/purchases/bills/actions";
import {
  DetailMoreMenu,
  type DetailMoreMenuItem,
} from "@/components/shell/detail-more-menu";
import { PendingButton } from "@/components/ui/pending-button";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";
import type { PurchaseStatus } from "@/modules/purchases/domain/types";

type PendingAction = "post" | "cancel" | null;

export function BillStatusActions({
  purchaseId,
  status,
  canUpdate,
  canCancel,
  moreItems = [],
}: {
  purchaseId: string;
  status: PurchaseStatus;
  canUpdate: boolean;
  canCancel: boolean;
  moreItems?: DetailMoreMenuItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    actionKey: PendingAction,
    message: string | null,
    action: (id: string) => Promise<{ error?: string }>,
    success: { title: string; description?: string }
  ) {
    if (message && !window.confirm(message)) {
      return;
    }
    startTransition(async () => {
      setPendingAction(actionKey);
      setError(null);
      const result = await action(purchaseId);
      setPendingAction(null);
      if (result.error) {
        setError(result.error);
        notifyError("Could not update bill", result.error);
        return;
      }
      notifySuccess(success.title, success.description);
      router.refresh();
    });
  }

  const actionItems =
    canCancel && status === "DRAFT"
      ? [
          {
            key: "cancel",
            label: "Cancel draft",
            onClick: () =>
              run(
                "cancel",
                "Cancel this draft bill? It will remain in your list as cancelled. Stock and accounts are not affected.",
                cancelPurchaseAction,
                {
                  title: "Draft cancelled",
                  description: "The bill remains in your list as cancelled.",
                }
              ),
            disabled: isPending,
            destructive: true,
          },
        ]
      : [];

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canUpdate && status === "DRAFT" ? (
          <PendingButton
            type="button"
            pending={isPending && pendingAction === "post"}
            onClick={() =>
              run(
                "post",
                "Post this bill? Inventory-tracked items will increase and accounts payable will be updated. This cannot be undone by editing the bill.",
                postPurchaseAction,
                {
                  title: "Bill posted",
                  description: "Inventory and accounts payable have been updated.",
                }
              )
            }
          >
            Post bill
          </PendingButton>
        ) : null}
        <DetailMoreMenu
          items={moreItems}
          actionItems={actionItems}
          disabled={isPending}
        />
      </div>
      {error ? (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
