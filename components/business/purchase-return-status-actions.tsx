"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelPurchaseReturnAction,
  postPurchaseReturnAction,
} from "@/app/app/(workspace)/purchases/returns/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PendingButton } from "@/components/ui/pending-button";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";
import type { PurchaseReturnStatus } from "@/modules/purchases/domain/types";

type PendingAction = "post" | "cancel" | null;

export function PurchaseReturnStatusActions({
  purchaseReturnId,
  status,
  canUpdate,
  canCancel,
}: {
  purchaseReturnId: string;
  status: PurchaseReturnStatus;
  canUpdate: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    actionKey: PendingAction,
    message: string | null,
    action: (id: string) => Promise<{ error?: string }>,
    success?: { title: string; description?: string }
  ) {
    if (message && !window.confirm(message)) {
      return;
    }
    startTransition(async () => {
      setPendingAction(actionKey);
      setError(null);
      const result = await action(purchaseReturnId);
      setPendingAction(null);
      if (result.error) {
        setError(result.error);
        notifyError("Could not update return", result.error);
        return;
      }
      if (success) {
        notifySuccess(success.title, success.description);
      }
      router.refresh();
    });
  }

  const showPost = canUpdate && status === "DRAFT";
  const showCancel = canCancel && status === "DRAFT";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {showPost ? (
          <PendingButton
            type="button"
            pending={isPending && pendingAction === "post"}
            onClick={() =>
              run(
                "post",
                "Post this return? Accounts, GST, and returned stock will update. This cannot be undone by editing the return.",
                postPurchaseReturnAction,
                {
                  title: "Return posted",
                  description: "Accounts, GST, and stock have been updated.",
                }
              )
            }
          >
            Post return
          </PendingButton>
        ) : null}
        {showCancel ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="outline" disabled={isPending} aria-label="More actions">
                  <MoreHorizontal className="size-5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  run(
                    "cancel",
                    "Cancel this draft return? It will remain in your list as cancelled.",
                    cancelPurchaseReturnAction,
                    {
                      title: "Draft cancelled",
                      description: "The return remains in your list as cancelled.",
                    }
                  )
                }
              >
                Cancel draft
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
