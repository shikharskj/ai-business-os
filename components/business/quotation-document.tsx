import { cn } from "@/lib/utils";
import type { QuotationDocumentView } from "@/modules/sales/application/quotation-document-view";

import {
  DOCUMENT_PREVIEW_ASIDE_CLASSNAME,
  documentPreviewAsideStyle,
  INVOICE_DOCUMENT_PREVIEW_SCALE,
} from "@/components/business/invoice-document";

export {
  DOCUMENT_PREVIEW_ASIDE_CLASSNAME,
  documentPreviewAsideStyle,
  INVOICE_DOCUMENT_PREVIEW_SCALE,
  INVOICE_DOCUMENT_PREVIEW_SCALE as QUOTATION_DOCUMENT_PREVIEW_SCALE,
};

function PartyBlock({
  label,
  party,
}: {
  label: string;
  party: QuotationDocumentView["seller"];
}) {
  return (
    <div className="min-w-0 border-l border-border pl-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{party.name}</p>
      {party.addressLines.map((line) => (
        <p key={line} className="text-xs leading-snug text-muted-foreground">
          {line}
        </p>
      ))}
      {party.gstin ? (
        <p className="mt-1 text-xs text-foreground">GSTIN: {party.gstin}</p>
      ) : null}
      {party.phone ? (
        <p className="text-xs text-muted-foreground">Phone: {party.phone}</p>
      ) : null}
      {party.email ? (
        <p className="text-xs text-muted-foreground">Email: {party.email}</p>
      ) : null}
    </div>
  );
}

function cell(value: string | null): string {
  return value ?? "—";
}

export function QuotationDocument({
  view,
  className,
}: {
  view: QuotationDocumentView;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex min-h-[297mm] w-full max-w-[210mm] flex-col bg-card p-8 text-foreground shadow-sm ring-1 ring-border",
        className
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          {view.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={view.logoUrl}
              alt=""
              className="size-14 rounded-md object-contain"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              {view.lettermark}
            </div>
          )}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {view.title}
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
              {view.number}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-right text-xs">
          <dt className="text-muted-foreground">Issue date</dt>
          <dd className="font-medium text-foreground">
            {view.issuedOn || "—"}
          </dd>
          <dt className="text-muted-foreground">Valid until</dt>
          <dd className="font-medium text-foreground">
            {view.validUntil || "—"}
          </dd>
          <dt className="text-muted-foreground">Place of supply</dt>
          <dd className="font-medium text-foreground">
            {view.placeOfSupply || "—"}
          </dd>
          {view.supplyTypeLabel ? (
            <>
              <dt className="text-muted-foreground">Supply</dt>
              <dd className="font-medium text-foreground">
                {view.supplyTypeLabel}
              </dd>
            </>
          ) : null}
        </dl>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-6">
        <PartyBlock label="Quoted by" party={view.seller} />
        <PartyBlock label="Quoted to" party={view.buyer} />
      </section>

      <section className="mt-6 flex-1">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Item</th>
              <th className="py-2 pr-2 font-medium">HSN</th>
              <th className="py-2 pr-2 text-right font-medium">Qty</th>
              <th className="py-2 pr-2 text-right font-medium">Rate</th>
              <th className="py-2 pr-2 text-right font-medium">Disc.</th>
              <th className="py-2 pr-2 text-right font-medium">Taxable</th>
              <th className="py-2 pr-2 text-right font-medium">GST</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {view.lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-4 text-muted-foreground">
                  Add a product line to preview this quotation.
                </td>
              </tr>
            ) : (
              view.lines.map((line, index) => (
                <tr
                  key={`${line.description}-${index}`}
                  className="border-b border-border/60"
                >
                  <td className="py-2 pr-2 font-medium text-foreground">
                    {line.description}
                  </td>
                  <td className="py-2 pr-2 font-mono text-muted-foreground">
                    {line.hsnSac ?? "—"}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-foreground">
                    {line.quantityLabel}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-foreground">
                    {line.unitPrice}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-foreground">
                    {line.discount}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-foreground">
                    {cell(line.taxable)}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-foreground">
                    {cell(line.taxRateLabel)}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium text-foreground">
                    {cell(line.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-6 flex justify-between gap-8">
        <div className="min-w-0 flex-1">
          {view.notes ? (
            <>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">
                {view.notes}
              </p>
            </>
          ) : null}
          {view.totalsPendingMessage ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {view.totalsPendingMessage}
            </p>
          ) : null}
          {view.totals ? (
            <p className="mt-4 text-xs text-muted-foreground">
              {view.totals.amountInWords}
            </p>
          ) : null}
        </div>
        <dl className="w-48 shrink-0 text-xs">
          <div className="flex justify-between gap-3 py-0.5">
            <dt className="text-muted-foreground">Taxable</dt>
            <dd className="tabular-nums font-medium text-foreground">
              {view.totals?.taxable ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-0.5">
            <dt className="text-muted-foreground">CGST</dt>
            <dd className="tabular-nums font-medium text-foreground">
              {view.totals?.cgst ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-0.5">
            <dt className="text-muted-foreground">SGST</dt>
            <dd className="tabular-nums font-medium text-foreground">
              {view.totals?.sgst ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-0.5">
            <dt className="text-muted-foreground">IGST</dt>
            <dd className="tabular-nums font-medium text-foreground">
              {view.totals?.igst ?? "—"}
            </dd>
          </div>
          <div className="mt-1.5 flex justify-between gap-3 border-t border-border pt-2.5 text-sm">
            <dt className="font-semibold text-foreground">Total</dt>
            <dd className="tabular-nums font-semibold text-foreground">
              {view.totals?.grandTotal ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <footer className="mt-8 border-t border-border pt-3 text-[10px] text-muted-foreground">
        Computer-generated quotation.
      </footer>
    </article>
  );
}

export function QuotationDocumentPreview({
  view,
  scale = INVOICE_DOCUMENT_PREVIEW_SCALE,
  className,
}: {
  view: QuotationDocumentView;
  scale?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("mx-auto w-fit max-w-full", className)}
      style={{ zoom: scale }}
    >
      <QuotationDocument view={view} />
    </div>
  );
}
