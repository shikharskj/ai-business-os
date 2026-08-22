"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelSalesOrderAction,
  confirmSalesOrderAction,
  convertSalesOrderAction,
} from "@/app/app/(workspace)/sales/orders/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PendingButton } from "@/components/ui/pending-button";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";
import type { SalesOrderStatus } from "@/modules/sales/domain/types";

type PendingAction = "confirm" | "convert" | "cancel" | null;

export function SalesOrderStatusActions({
  salesOrderId,
  status,
  canUpdate,
  canCancel,
  canCreateInvoice,
}: {
  salesOrderId: string;
  status: SalesOrderStatus;
  canUpdate: boolean;
  canCancel: boolean;
  canCreateInvoice: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    actionKey: PendingAction,
    message: string | null,
    action: (id: string) => Promise<{ error?: string; invoiceId?: string }>,
    success?: { title: string; description?: string }
  ) {
    if (message && !window.confirm(message)) {
      return;
    }
    startTransition(async () => {
      setPendingAction(actionKey);
      setError(null);
      const result = await action(salesOrderId);
      setPendingAction(null);
      if (result.error) {
        setError(result.error);
        notifyError("Could not update sales order", result.error);
        return;
      }
      if (result.invoiceId) {
        notifySuccess(
          "Invoice created",
          "The sales order was converted to a draft invoice. Stock updates when you post the invoice."
        );
        router.push(`/app/sales/invoices/${result.invoiceId}`);
        return;
      }
      if (success) {
        notifySuccess(success.title, success.description);
      }
      router.refresh();
    });
  }

  const showCancel =
    canCancel && (status === "DRAFT" || status === "CONFIRMED");

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canUpdate && status === "DRAFT" ? (
          <PendingButton
            type="button"
            pending={isPending && pendingAction === "confirm"}
            onClick={() =>
              run(
                "confirm",
                "Confirm this sales order? Stock and accounts stay unchanged until you convert to an invoice and post it.",
                confirmSalesOrderAction,
                {
                  title: "Sales order confirmed",
                  description: "Stock and accounts were not updated.",
                }
              )
            }
          >
            Confirm order
          </PendingButton>
        ) : null}
        {canCreateInvoice && status === "CONFIRMED" ? (
          <PendingButton
            type="button"
            pending={isPending && pendingAction === "convert"}
            onClick={() =>
              run(
                "convert",
                "Convert this sales order to a draft invoice? Line items and GST totals will be copied. Stock still updates only when you post the invoice.",
                convertSalesOrderAction
              )
            }
          >
            Convert to invoice
          </PendingButton>
        ) : null}
        {showCancel ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  aria-label="More actions"
                >
                  <MoreHorizontal className="size-5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  run(
                    "cancel",
                    "Cancel this sales order? It will remain in your list as cancelled. Stock and accounts are not affected.",
                    cancelSalesOrderAction,
                    {
                      title: "Sales order cancelled",
                      description: "The order remains in your list as cancelled.",
                    }
                  )
                }
              >
                Cancel order
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
