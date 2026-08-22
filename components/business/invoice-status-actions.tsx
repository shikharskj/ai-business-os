"use client";

import { useState, useTransition } from "react";

import {
  cancelInvoiceAction,
  exportInvoicePdfAction,
  postInvoiceAction,
} from "@/app/app/(workspace)/sales/invoices/actions";
import { Button } from "@/components/ui/button";
import { isPostedInvoiceStatus } from "@/modules/sales/domain/invoice-status";
import type { SalesInvoiceStatus } from "@/modules/sales/domain/types";

export function InvoiceStatusActions({
  invoiceId,
  status,
  canUpdate,
  canCancel,
  canRead,
}: {
  invoiceId: string;
  status: SalesInvoiceStatus;
  canUpdate: boolean;
  canCancel: boolean;
  canRead: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    message: string | null,
    action: (id: string) => Promise<{ error?: string; documentId?: string }>
  ) {
    if (message && !window.confirm(message)) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await action(invoiceId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.documentId) {
        window.open(`/api/documents/${result.documentId}`, "_blank", "noopener,noreferrer");
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
                "Post this invoice? Inventory-tracked items will be reduced and accounts will be updated. This cannot be undone by editing the invoice.",
                postInvoiceAction
              )
            }
          >
            Post invoice
          </Button>
        ) : null}
        {canRead && isPostedInvoiceStatus(status) ? (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => run(null, exportInvoicePdfAction)}
          >
            Export PDF
          </Button>
        ) : null}
        {canCancel && status === "DRAFT" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              run(
                "Cancel this draft invoice? It will remain in your list as cancelled. Stock and accounts are not affected.",
                cancelInvoiceAction
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
