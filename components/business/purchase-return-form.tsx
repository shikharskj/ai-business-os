"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  createPurchaseReturnAction,
  previewPurchaseReturnTotalsAction,
  updatePurchaseReturnAction,
  type PurchaseReturnActionState,
  type PurchaseReturnPreviewState,
} from "@/app/app/(workspace)/purchases/returns/actions";
import { GstBreakdown } from "@/components/business/gst-breakdown";
import { DatePicker } from "@/components/date-picker";
import {
  DocumentFormPreviewAside,
  DocumentFormPreviewLayout,
  DocumentFormPreviewMain,
} from "@/components/shell/document-form-preview-layout";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { FORM_PLACEHOLDERS } from "@/lib/forms/placeholders";
import { moneyFromMajor } from "@/modules/shared-kernel/money";
import type { PurchaseReturn } from "@/modules/purchases/domain/types";
import { toQuantityMajorString } from "@/modules/inventory/domain/quantity";

export type PurchaseReturnBillLineOption = {
  id: string;
  productName: string;
  sku: string;
  unitOfMeasurement: string;
  remainingMajor: string;
};

export type PurchaseReturnBillOption = {
  id: string;
  number: string;
  supplierName: string;
  issuedOn: string;
  lines: PurchaseReturnBillLineOption[];
};

function FieldError({
  name,
  fieldErrors,
}: {
  name: string;
  fieldErrors?: Record<string, string>;
}) {
  const message = fieldErrors?.[name];
  if (!message) {
    return null;
  }
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

export function PurchaseReturnForm({
  today,
  bills,
  purchaseReturn,
  lockPurchase = false,
}: {
  today: string;
  bills: PurchaseReturnBillOption[];
  purchaseReturn?: PurchaseReturn;
  lockPurchase?: boolean;
}) {
  const action = purchaseReturn ? updatePurchaseReturnAction : createPurchaseReturnAction;
  const [state, formAction, pending] = useActionState<
    PurchaseReturnActionState,
    FormData
  >(action, {});
  const [purchaseId, setPurchaseId] = useState(
    purchaseReturn?.purchaseId ?? bills[0]?.id ?? ""
  );
  const [issuedOn, setIssuedOn] = useState(purchaseReturn?.issuedOn ?? today);
  const [notes, setNotes] = useState(purchaseReturn?.notes ?? "");
  const [quantities, setQuantities] = useState<Record<string, string>>(() => {
    if (!purchaseReturn) {
      return {};
    }
    return Object.fromEntries(
      purchaseReturn.lines.map((line) => [
        line.sourcePurchaseLineId,
        toQuantityMajorString(line.quantity),
      ])
    );
  });
  const [preview, setPreview] = useState<PurchaseReturnPreviewState>({});

  const selectedBill = useMemo(
    () => bills.find((bill) => bill.id === purchaseId),
    [bills, purchaseId]
  );

  const previewLines = useMemo(() => {
    if (!purchaseId || !selectedBill) {
      return [];
    }
    return selectedBill.lines
      .map((line) => ({
        purchaseLineId: line.id,
        quantity: quantities[line.id] ?? "",
      }))
      .filter((line) => line.quantity.trim().length > 0);
  }, [purchaseId, selectedBill, quantities]);

  useEffect(() => {
    if (previewLines.length === 0) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void previewPurchaseReturnTotalsAction({
        purchaseReturnId: purchaseReturn?.id,
        purchaseId,
        issuedOn,
        notes: notes || undefined,
        lines: previewLines,
      }).then((result) => {
        if (!cancelled) {
          setPreview(result);
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [purchaseReturn?.id, purchaseId, issuedOn, notes, previewLines]);

  const completeLines =
    selectedBill?.lines.filter((line) => {
      const qty = quantities[line.id]?.trim();
      return qty && qty !== "0" && qty !== "0.0000";
    }) ?? [];

  return (
    <form action={formAction}>
      {purchaseReturn ? (
        <input type="hidden" name="purchaseReturnId" value={purchaseReturn.id} />
      ) : null}
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <input type="hidden" name="lineCount" value={String(completeLines.length)} />
      {completeLines.map((line, index) => (
        <div key={line.id}>
          <input type="hidden" name={`line-${index}-purchaseLineId`} value={line.id} />
          <input
            type="hidden"
            name={`line-${index}-quantity`}
            value={quantities[line.id] ?? ""}
          />
        </div>
      ))}

      <DocumentFormPreviewLayout>
        <DocumentFormPreviewMain className="flex flex-col gap-6">
          {state.error ? (
            <p className="text-base text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="purchaseId" className="text-base font-medium">
                Bill
              </label>
              <Combobox
                id="purchaseId"
                value={purchaseId}
                onValueChange={setPurchaseId}
                disabled={lockPurchase || Boolean(purchaseReturn)}
                options={bills.map((bill) => ({
                  value: bill.id,
                  label: `${bill.number} · ${bill.supplierName}`,
                  keywords: bill.number,
                }))}
                placeholder="Select a posted bill"
                searchPlaceholder="Search bills…"
              />
              <FieldError name="purchaseId" fieldErrors={state.fieldErrors} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="issuedOn" className="text-base font-medium">
                Date
              </label>
              <DatePicker
                id="issuedOn"
                name="issuedOn"
                value={issuedOn}
                onValueChange={setIssuedOn}
              />
              <FieldError name="issuedOn" fieldErrors={state.fieldErrors} />
            </div>
          </div>

          {selectedBill ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-medium">Quantities to return</h2>
              {selectedBill.lines.length === 0 ? (
                <p className="text-base text-muted-foreground">
                  This bill has no remaining quantity to return.
                </p>
              ) : (
                selectedBill.lines.map((line) => (
                  <div
                    key={line.id}
                    className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]"
                  >
                    <div>
                      <p className="font-medium">{line.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {line.sku} · remaining {line.remainingMajor} {line.unitOfMeasurement}
                      </p>
                    </div>
                    <Input
                      id={`qty-${line.id}`}
                      inputMode="decimal"
                      value={quantities[line.id] ?? ""}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [line.id]: event.target.value,
                        }))
                      }
                      placeholder={line.remainingMajor}
                    />
                  </div>
                ))
              )}
              <FieldError name="lines" fieldErrors={state.fieldErrors} />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className="text-base font-medium">
              Notes
            </label>
            <Textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={FORM_PLACEHOLDERS.notes}
              rows={3}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <SubmitButton pending={pending}>
              {purchaseReturn ? "Save return" : "Create return"}
            </SubmitButton>
            <Button
              nativeButton={false}
              variant="outline"
              render={
                <Link
                  href={
                    purchaseReturn
                      ? `/app/purchases/returns/${purchaseReturn.id}`
                      : "/app/purchases/returns"
                  }
                />
              }
            >
              Cancel
            </Button>
          </div>
        </DocumentFormPreviewMain>

        <DocumentFormPreviewAside>
          <p className="mb-2 text-sm font-medium text-muted-foreground">GST preview</p>
          {previewLines.length > 0 && preview.taxableAmountMajor && preview.supplyType ? (
            <GstBreakdown
              taxableAmount={moneyFromMajor(preview.taxableAmountMajor)}
              cgst={moneyFromMajor(preview.cgstMajor ?? "0")}
              sgst={moneyFromMajor(preview.sgstMajor ?? "0")}
              igst={moneyFromMajor(preview.igstMajor ?? "0")}
              totalTax={moneyFromMajor(preview.totalTaxMajor ?? "0")}
              grandTotal={moneyFromMajor(preview.grandTotalMajor ?? "0")}
              supplyType={preview.supplyType}
            />
          ) : (
            <p className="text-base text-muted-foreground">
              {preview.error ?? "Enter quantities to see GST totals."}
            </p>
          )}
        </DocumentFormPreviewAside>
      </DocumentFormPreviewLayout>
    </form>
  );
}
