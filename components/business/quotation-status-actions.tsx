"use client";

import { useState, useTransition } from "react";

import {
  acceptQuotationAction,
  cancelQuotationAction,
  convertQuotationAction,
  sendQuotationAction,
} from "@/app/app/(workspace)/sales/quotations/actions";
import { Button } from "@/components/ui/button";
import type { QuotationStatus } from "@/modules/sales/domain/types";

export function QuotationStatusActions({
  quotationId,
  status,
  canUpdate,
  canCancel,
}: {
  quotationId: string;
  status: QuotationStatus;
  canUpdate: boolean;
  canCancel: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    message: string | null,
    action: (id: string) => Promise<{ error?: string }>
  ) {
    if (message && !window.confirm(message)) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await action(quotationId);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {canUpdate && status === "DRAFT" ? (
          <Button
            type="button"
            disabled={isPending}
            onClick={() => run(null, sendQuotationAction)}
          >
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
        {canUpdate && (status === "ACCEPTED" || status === "SENT") ? (
          <Button
            type="button"
            variant="outline"
            disabled={true}
            onClick={() => run(null, convertQuotationAction)}
            title="Invoice conversion is not yet implemented"
          >
            Convert to invoice
          </Button>
        ) : null}
        {canCancel && (status === "DRAFT" || status === "SENT" || status === "ACCEPTED") ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              run(
                "Cancel this quotation? It will remain in your list as cancelled. Stock and accounts are not affected.",
                cancelQuotationAction
              )
            }
          >
            Cancel quotation
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
