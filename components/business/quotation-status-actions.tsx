"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  acceptQuotationAction,
  cancelQuotationAction,
  convertQuotationAction,
  exportQuotationPdfAction,
  sendQuotationAction,
} from "@/app/app/(workspace)/sales/quotations/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PendingButton } from "@/components/ui/pending-button";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";
import type { QuotationStatus } from "@/modules/sales/domain/types";

type PendingAction =
  | "send"
  | "accept"
  | "convert"
  | "export"
  | "cancel"
  | null;

export function QuotationStatusActions({
  quotationId,
  status,
  canUpdate,
  canCancel,
  canRead,
}: {
  quotationId: string;
  status: QuotationStatus;
  canUpdate: boolean;
  canCancel: boolean;
  canRead: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    actionKey: PendingAction,
    message: string | null,
    action: (id: string) => Promise<{
      error?: string;
      invoiceId?: string;
      documentId?: string;
    }>,
    success?: { title: string; description?: string }
  ) {
    if (message && !window.confirm(message)) {
      return;
    }
    startTransition(async () => {
      setPendingAction(actionKey);
      setError(null);
      const result = await action(quotationId);
      setPendingAction(null);
      if (result.error) {
        setError(result.error);
        notifyError("Could not update quotation", result.error);
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
        notifySuccess("PDF ready", "Your quotation PDF opened in a new tab.");
        router.refresh();
        return;
      }
      if (result.invoiceId) {
        notifySuccess(
          "Invoice created",
          "The quotation was converted to a draft invoice."
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

  const menuItems = [
    canRead && (status === "SENT" || status === "ACCEPTED")
      ? {
          key: "export",
          label: "Export PDF",
          action: () => run("export", null, exportQuotationPdfAction),
        }
      : null,
    canCancel && (status === "DRAFT" || status === "SENT" || status === "ACCEPTED")
      ? {
          key: "cancel",
          label: "Cancel quotation",
          action: () =>
            run(
              "cancel",
              "Cancel this quotation? It will remain in your list as cancelled. Stock and accounts are not affected.",
              cancelQuotationAction,
              {
                title: "Quotation cancelled",
                description: "The quotation remains in your list as cancelled.",
              }
            ),
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; action: () => void }[];

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canUpdate && status === "DRAFT" ? (
          <PendingButton
            type="button"
            pending={isPending && pendingAction === "send"}
            onClick={() =>
              run("send", null, sendQuotationAction, {
                title: "Quotation sent",
                description: "The quotation is now marked as sent.",
              })
            }
          >
            Mark sent
          </PendingButton>
        ) : null}
        {canUpdate && status === "SENT" ? (
          <PendingButton
            type="button"
            pending={isPending && pendingAction === "accept"}
            onClick={() =>
              run("accept", null, acceptQuotationAction, {
                title: "Quotation accepted",
                description: "The quotation is now marked as accepted.",
              })
            }
          >
            Mark accepted
          </PendingButton>
        ) : null}
        {canUpdate && status === "ACCEPTED" ? (
          <PendingButton
            type="button"
            pending={isPending && pendingAction === "convert"}
            onClick={() =>
              run(
                "convert",
                "Convert this quotation to a draft invoice? Line items and GST totals will be copied.",
                convertQuotationAction
              )
            }
          >
            Convert to invoice
          </PendingButton>
        ) : null}
        {menuItems.length > 0 ? (
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
              {menuItems.map((item) => (
                <DropdownMenuItem key={item.key} onClick={item.action}>
                  {item.label}
                </DropdownMenuItem>
              ))}
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
