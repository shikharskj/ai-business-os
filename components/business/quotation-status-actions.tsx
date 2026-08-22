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
import type { QuotationStatus } from "@/modules/sales/domain/types";

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
  const [isPending, startTransition] = useTransition();

  function run(
    message: string | null,
    action: (id: string) => Promise<{
      error?: string;
      invoiceId?: string;
      documentId?: string;
    }>
  ) {
    if (message && !window.confirm(message)) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await action(quotationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.documentId) {
        const opened = window.open(
          `/api/documents/${result.documentId}`,
          "_blank",
          "noopener,noreferrer"
        );
        if (!opened) {
          setError("Popup blocked. Please allow popups to open the PDF.");
        }
        router.refresh();
        return;
      }
      if (result.invoiceId) {
        router.push(`/app/sales/invoices/${result.invoiceId}`);
        return;
      }
      router.refresh();
    });
  }

  const menuItems = [
    canRead && (status === "SENT" || status === "ACCEPTED")
      ? { key: "export", label: "Export PDF", action: () => run(null, exportQuotationPdfAction) }
      : null,
    canCancel && (status === "DRAFT" || status === "SENT" || status === "ACCEPTED")
      ? {
          key: "cancel",
          label: "Cancel quotation",
          action: () =>
            run(
              "Cancel this quotation? It will remain in your list as cancelled. Stock and accounts are not affected.",
              cancelQuotationAction
            ),
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; action: () => void }[];

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canUpdate && status === "DRAFT" ? (
          <Button type="button" disabled={isPending} onClick={() => run(null, sendQuotationAction)}>
            Mark sent
          </Button>
        ) : null}
        {canUpdate && status === "SENT" ? (
          <Button
            type="button"
            disabled={isPending}
            onClick={() => run(null, acceptQuotationAction)}
          >
            Mark accepted
          </Button>
        ) : null}
        {canUpdate && status === "ACCEPTED" ? (
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(
                "Convert this quotation to a draft invoice? Line items and GST totals will be copied.",
                convertQuotationAction
              )
            }
          >
            Convert to invoice
          </Button>
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
