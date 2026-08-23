"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { formatDisplayDate } from "@/components/business/inventory-labels";
import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import { CREDIT_NOTE_STATUS_TONES } from "@/components/business/status-tone";
import { useListTableHref } from "@/components/business/list-table-client";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { CreditNote } from "@/modules/sales/domain/types";
import { creditNoteStatusLabel } from "@/modules/sales/domain/credit-note-status";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type CreditNotesDataTableProps = {
  items: CreditNote[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, CreditNote>[] = [
  {
    accessorKey: "number",
    header: "Number",
    cell: ({ row }) => (
      <Link
        href={`/app/sales/credit-notes/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => (
      <Link
        href={`/app/sales/customers/${row.original.customerId}`}
        className="font-medium hover:underline"
      >
        {row.original.customerName}
      </Link>
    ),
  },
  {
    accessorKey: "invoiceNumber",
    header: "Invoice",
    cell: ({ row }) => (
      <Link
        href={`/app/sales/invoices/${row.original.invoiceId}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.invoiceNumber}
      </Link>
    ),
  },
  {
    accessorKey: "issuedOn",
    header: "Date",
    cell: ({ row }) => formatDisplayDate(row.original.issuedOn),
  },
  {
    id: "amount",
    header: () => <span className="block text-right">Amount</span>,
    cell: ({ row }) => (
      <div className="text-right">
        <MoneyDisplay value={row.original.grandTotal} />
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge tone={CREDIT_NOTE_STATUS_TONES[row.original.status]}>
        {creditNoteStatusLabel(row.original.status)}
      </StatusBadge>
    ),
  },
];

export function CreditNotesDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: CreditNotesDataTableProps) {
  const buildHref = useListTableHref("/app/sales/credit-notes", queryString);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      page={page}
      pageSize={pageSize}
      total={total}
      buildHref={buildHref}
      listKey="credit-notes"
      enableReorder={false}
    />
  );
}
