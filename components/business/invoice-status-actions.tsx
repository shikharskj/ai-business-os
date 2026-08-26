"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelInvoiceAction,
  exportInvoicePdfAction,
  postInvoiceAction,
} from "@/app/app/(workspace)/sales/invoices/actions";
import {
  DetailMoreMenu,
  type DetailMoreMenuItem,
} from "@/components/shell/detail-more-menu";
import { PendingButton } from "@/components/ui/pending-button";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";
import { isPostedInvoiceStatus } from "@/modules/sales/domain/invoice-status";
import type { SalesInvoiceStatus } from "@/modules/sales/domain/types";

type PendingAction = "post" | "export" | "cancel" | null;

export function InvoiceStatusActions({
  invoiceId,
  status,
  canUpdate,
  canCancel,
  canRead,
  exportInMenu = false,
  moreItems = [],
}: {
  invoiceId: string;
  status: SalesInvoiceStatus;
  canUpdate: boolean;
  canCancel: boolean;
  canRead: boolean;
  exportInMenu?: boolean;
  moreItems?: DetailMoreMenuItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    actionKey: PendingAction,
    message: string | null,
    action: (id: string) => Promise<{ error?: string; documentId?: string }>,
    success?: { title: string; description?: string }
  ) {
    if (message && !window.confirm(message)) {
      return;
    }
    startTransition(async () => {
      setPendingAction(actionKey);
      setError(null);
      const result = await action(invoiceId);
      setPendingAction(null);
      if (result.error) {
        setError(result.error);
        notifyError("Could not update invoice", result.error);
        return;
      }
      if (result.documentId) {
        const opened = window.open(
          `/api/documents/${result.documentId}`,
          "_blank",
          "noopener,noreferrer"
        );
        if (!opened) {
          const popupError = "Popup blocked. Please allow popups to open the PDF.";
          setError(popupError);
          notifyError("Could not open PDF", popupError);
          return;
        }
        notifySuccess("PDF ready", "Your invoice PDF opened in a new tab.");
        router.refresh();
        return;
      }
      if (success) {
        notifySuccess(success.title, success.description);
      }
      router.refresh();
    });
  }

  const showPost = canUpdate && status === "DRAFT";
  const showExport = canRead && isPostedInvoiceStatus(status);
  const showCancel = canCancel && status === "DRAFT";
  const actionItems = [
    showExport && exportInMenu
      ? {
          key: "export",
          label: "Export PDF",
          onClick: () => run("export", null, exportInvoicePdfAction),
          disabled: isPending,
        }
      : null,
    showCancel
      ? {
          key: "cancel",
          label: "Cancel draft",
          onClick: () =>
            run(
              "cancel",
              "Cancel this draft invoice? It will remain in your list as cancelled. Stock and accounts are not affected.",
              cancelInvoiceAction,
              {
                title: "Draft cancelled",
                description: "The invoice remains in your list as cancelled.",
              }
            ),
          disabled: isPending,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }[];

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
                "Post this invoice? Inventory-tracked items will be reduced and accounts will be updated. This cannot be undone by editing the invoice.",
                postInvoiceAction,
                {
                  title: "Invoice posted",
                  description: "Inventory and accounts have been updated.",
                }
              )
            }
          >
            Post invoice
          </PendingButton>
        ) : null}
        {showExport && !exportInMenu ? (
          <PendingButton
            type="button"
            variant="outline"
            pending={isPending && pendingAction === "export"}
            onClick={() => run("export", null, exportInvoicePdfAction)}
          >
            Export PDF
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
