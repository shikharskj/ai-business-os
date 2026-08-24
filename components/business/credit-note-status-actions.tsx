"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelCreditNoteAction,
  postCreditNoteAction,
} from "@/app/app/(workspace)/sales/credit-notes/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PendingButton } from "@/components/ui/pending-button";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";
import type { CreditNoteStatus } from "@/modules/sales/domain/types";

type PendingAction = "post" | "cancel" | null;

export function CreditNoteStatusActions({
  creditNoteId,
  status,
  canUpdate,
  canCancel,
}: {
  creditNoteId: string;
  status: CreditNoteStatus;
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
      const result = await action(creditNoteId);
      setPendingAction(null);
      if (result.error) {
        setError(result.error);
        notifyError("Could not update credit note", result.error);
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
                "Post this credit note? Accounts, GST, and returned stock will update. This cannot be undone by editing the credit note.",
                postCreditNoteAction,
                {
                  title: "Credit note posted",
                  description: "Accounts, GST, and stock have been updated.",
                }
              )
            }
          >
            Post credit note
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
                    "Cancel this draft credit note? It will remain in your list as cancelled.",
                    cancelCreditNoteAction,
                    {
                      title: "Draft cancelled",
                      description: "The credit note remains in your list as cancelled.",
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
