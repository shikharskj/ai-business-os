"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deactivateCustomerAction } from "@/app/app/(workspace)/sales/customers/actions";
import {
  DetailMoreMenu,
  type DetailMoreMenuItem,
} from "@/components/shell/detail-more-menu";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";

/** Customer detail overflow: nav links + Deactivate (secondary to Edit). */
export function CustomerDetailMoreMenu({
  items,
  deactivate,
}: {
  items: DetailMoreMenuItem[];
  deactivate?: { customerId: string; customerName: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const actionItems = deactivate
    ? [
        {
          key: "deactivate",
          label: "Deactivate",
          disabled: isPending,
          destructive: true,
          onClick: () => {
            if (
              !window.confirm(
                `Deactivate ${deactivate.customerName}? They will no longer appear in the active customer list. This can be reviewed later; invoices are not deleted.`
              )
            ) {
              return;
            }

            startTransition(async () => {
              setError(null);
              const result = await deactivateCustomerAction(deactivate.customerId);
              if (result.error) {
                setError(result.error);
                notifyError("Could not deactivate customer", result.error);
                return;
              }
              notifySuccess(
                "Customer deactivated",
                `${deactivate.customerName} is no longer active.`
              );
              router.refresh();
            });
          },
        },
      ]
    : [];

  return (
    <div className="flex flex-col items-end gap-2">
      <DetailMoreMenu
        items={items}
        actionItems={actionItems}
        disabled={isPending}
      />
      {error ? (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
