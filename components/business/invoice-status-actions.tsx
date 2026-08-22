"use client";

import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";

import {
  cancelInvoiceAction,
  exportInvoicePdfAction,
  postInvoiceAction,
} from "@/app/app/(workspace)/sales/invoices/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isPostedInvoiceStatus } from "@/modules/sales/domain/invoice-status";
import type { SalesInvoiceStatus } from "@/modules/sales/domain/types";

export function InvoiceStatusActions({
  invoiceId,
  status,
  canUpdate,
  canCancel,
  canRead,
  exportInMenu = false,
}: {
  invoiceId: string;
  status: SalesInvoiceStatus;
  canUpdate: boolean;
  canCancel: boolean;
  canRead: boolean;
  /** When true, Export PDF lives in the overflow menu (e.g. Record payment is primary). */
  exportInMenu?: boolean;
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
        const opened = window.open(
          `/api/documents/${result.documentId}`,
          "_blank",
          "noopener,noreferrer"
        );
        if (!opened) {
          setError("Popup blocked. Please allow popups to open the PDF.");
        }
        window.location.reload();
        return;
      }
      window.location.reload();
    });
  }

  const showPost = canUpdate && status === "DRAFT";
  const showExport = canRead && isPostedInvoiceStatus(status);
  const showCancel = canCancel && status === "DRAFT";
  const menuItems = [
    showExport && exportInMenu
      ? { key: "export", label: "Export PDF", action: () => run(null, exportInvoicePdfAction) }
      : null,
    showCancel
      ? {
          key: "cancel",
          label: "Cancel draft",
          action: () =>
            run(
              "Cancel this draft invoice? It will remain in your list as cancelled. Stock and accounts are not affected.",
              cancelInvoiceAction
            ),
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; action: () => void }[];

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {showPost ? (
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
        {showExport && !exportInMenu ? (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => run(null, exportInvoicePdfAction)}
          >
            Export PDF
          </Button>
        ) : null}
        {menuItems.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="outline" disabled={isPending} aria-label="More actions">
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
