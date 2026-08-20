"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
} from "@/components/business/status-tone";
import { useListTableHref } from "@/components/business/list-table-client";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { SalesInvoice } from "@/modules/sales/domain/types";
import { paymentStatusLabel } from "@/modules/sales/domain/invoice-status";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type InvoicesDataTableProps = {
  items: SalesInvoice[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, SalesInvoice>[] = [
  {
    accessorKey: "number",
    header: "Number",
    cell: ({ row }) => (
      <Link
        href={`/app/sales/invoices/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "customerName", header: "Customer" },
  {
    accessorKey: "issuedOn",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.original.issuedOn);
      return date.toLocaleDateString("en-IN", { timeZone: "UTC" });
    },
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge tone={INVOICE_STATUS_TONES[row.original.status]}>
        {INVOICE_STATUS_LABELS[row.original.status]}
      </StatusBadge>
    ),
  },
  {
    id: "payment",
    header: "Payment",
    cell: ({ row }) => paymentStatusLabel(row.original.status),
  },
];

export function InvoicesDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: InvoicesDataTableProps) {
  const buildHref = useListTableHref("/app/sales/invoices", queryString);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      page={page}
      pageSize={pageSize}
      total={total}
      buildHref={buildHref}
      listKey="invoices"
    />
  );
}
