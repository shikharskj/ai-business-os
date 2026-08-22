"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  createCreditNoteAction,
  previewCreditNoteTotalsAction,
  updateCreditNoteAction,
  type CreditNoteActionState,
  type CreditNotePreviewState,
} from "@/app/app/(workspace)/sales/credit-notes/actions";
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
import type { CreditNote } from "@/modules/sales/domain/types";
import { toQuantityMajorString } from "@/modules/inventory/domain/quantity";

export type CreditNoteInvoiceLineOption = {
  id: string;
  productName: string;
  sku: string;
  unitOfMeasurement: string;
  remainingMajor: string;
};

export type CreditNoteInvoiceOption = {
  id: string;
  number: string;
  customerName: string;
  issuedOn: string;
  lines: CreditNoteInvoiceLineOption[];
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

export function CreditNoteForm({
  today,
  invoices,
  creditNote,
  lockInvoice = false,
}: {
  today: string;
  invoices: CreditNoteInvoiceOption[];
  creditNote?: CreditNote;
  lockInvoice?: boolean;
}) {
  const action = creditNote ? updateCreditNoteAction : createCreditNoteAction;
  const [state, formAction, pending] = useActionState<CreditNoteActionState, FormData>(
    action,
    {}
  );
  const [invoiceId, setInvoiceId] = useState(
    creditNote?.invoiceId ?? invoices[0]?.id ?? ""
  );
  const [issuedOn, setIssuedOn] = useState(creditNote?.issuedOn ?? today);
  const [notes, setNotes] = useState(creditNote?.notes ?? "");
  const [quantities, setQuantities] = useState<Record<string, string>>(() => {
    if (!creditNote) {
      return {};
    }
    return Object.fromEntries(
      creditNote.lines.map((line) => [
        line.sourceInvoiceLineId,
        toQuantityMajorString(line.quantity),
      ])
    );
  });
  const [preview, setPreview] = useState<CreditNotePreviewState>({});

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === invoiceId),
    [invoices, invoiceId]
  );

  useEffect(() => {
    if (!invoiceId || !selectedInvoice) {
      setPreview({});
      return;
    }
    const lines = selectedInvoice.lines
      .map((line) => ({
        invoiceLineId: line.id,
        quantity: quantities[line.id] ?? "",
      }))
      .filter((line) => line.quantity.trim().length > 0);
    if (lines.length === 0) {
      setPreview({});
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void previewCreditNoteTotalsAction({
        creditNoteId: creditNote?.id,
        invoiceId,
        issuedOn,
        notes: notes || undefined,
        lines,
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
  }, [creditNote?.id, invoiceId, issuedOn, notes, quantities, selectedInvoice]);

  const completeLines = selectedInvoice?.lines.filter((line) => {
    const qty = quantities[line.id]?.trim();
    return qty && qty !== "0" && qty !== "0.0000";
  }) ?? [];

  return (
    <form action={formAction}>
      {creditNote ? <input type="hidden" name="creditNoteId" value={creditNote.id} /> : null}
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="lineCount" value={String(completeLines.length)} />
      {completeLines.map((line, index) => (
        <div key={line.id}>
          <input type="hidden" name={`line-${index}-invoiceLineId`} value={line.id} />
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
              <label htmlFor="invoiceId" className="text-base font-medium">
                Invoice
              </label>
              <Combobox
                id="invoiceId"
                value={invoiceId}
                onValueChange={setInvoiceId}
                disabled={lockInvoice || Boolean(creditNote)}
                options={invoices.map((invoice) => ({
                  value: invoice.id,
                  label: `${invoice.number} · ${invoice.customerName}`,
                  keywords: invoice.number,
                }))}
                placeholder="Select a posted invoice"
                searchPlaceholder="Search invoices…"
              />
              <FieldError name="invoiceId" fieldErrors={state.fieldErrors} />
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

          {selectedInvoice ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-medium">Quantities to credit</h2>
              {selectedInvoice.lines.length === 0 ? (
                <p className="text-base text-muted-foreground">
                  This invoice has no remaining quantity to credit.
                </p>
              ) : (
                selectedInvoice.lines.map((line) => (
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
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`qty-${line.id}`} className="sr-only">
                        Quantity for {line.productName}
                      </label>
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
              {creditNote ? "Save credit note" : "Create credit note"}
            </SubmitButton>
            <Button
              nativeButton={false}
              variant="outline"
              render={
                <Link
                  href={
                    creditNote
                      ? `/app/sales/credit-notes/${creditNote.id}`
                      : "/app/sales/credit-notes"
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
          {preview.taxableAmountMajor && preview.supplyType ? (
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
