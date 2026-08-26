"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  acceptQuotationAction,
  cancelQuotationAction,
  convertQuotationAction,
  convertQuotationToSalesOrderAction,
  exportQuotationPdfAction,
  sendQuotationAction,
} from "@/app/app/(workspace)/sales/quotations/actions";
import {
  DetailMoreMenu,
  type DetailMoreMenuItem,
} from "@/components/shell/detail-more-menu";
import { PendingButton } from "@/components/ui/pending-button";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";
import type { QuotationStatus } from "@/modules/sales/domain/types";

type PendingAction =
  | "send"
  | "accept"
  | "convertOrder"
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
  moreItems = [],
}: {
  quotationId: string;
  status: QuotationStatus;
  canUpdate: boolean;
  canCancel: boolean;
  canRead: boolean;
  moreItems?: DetailMoreMenuItem[];
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
      salesOrderId?: string;
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
      if (result.salesOrderId) {
        notifySuccess(
          "Sales order created",
          "The quotation was converted to a confirmed sales order."
        );
        router.push(`/app/sales/orders/${result.salesOrderId}`);
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

  const actionItems = [
    canUpdate && status === "ACCEPTED"
      ? {
          key: "convert",
          label: "Convert to invoice",
          onClick: () =>
            run(
              "convert",
              "Convert this quotation to a draft invoice? Line items and GST totals will be copied.",
              convertQuotationAction
            ),
          disabled: isPending,
        }
      : null,
    canRead && (status === "SENT" || status === "ACCEPTED")
      ? {
          key: "export",
          label: "Export PDF",
          onClick: () => run("export", null, exportQuotationPdfAction),
          disabled: isPending,
        }
      : null,
    canCancel && (status === "DRAFT" || status === "SENT" || status === "ACCEPTED")
      ? {
          key: "cancel",
          label: "Cancel quotation",
          onClick: () =>
            run(
              "cancel",
              "Cancel this quotation? It will remain in your list as cancelled. Stock and accounts are not affected.",
              cancelQuotationAction,
              {
                title: "Quotation cancelled",
                description: "The quotation remains in your list as cancelled.",
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
            pending={isPending && pendingAction === "convertOrder"}
            onClick={() =>
              run(
                "convertOrder",
                "Create a confirmed sales order from this quotation? Stock and accounts stay unchanged until you invoice and post.",
                convertQuotationToSalesOrderAction
              )
            }
          >
            Create order
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
