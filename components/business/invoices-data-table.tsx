"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { formatDisplayDate } from "@/components/business/inventory-labels";
import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import { invoicePaymentBadgePresentation } from "@/components/business/status-tone";
import { useListTableHref } from "@/components/business/list-table-client";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { InvoiceListRow } from "@/modules/sales/application/invoice-list-rows";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type InvoicesDataTableProps = {
  items: InvoiceListRow[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, InvoiceListRow>[] = [
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
    accessorKey: "issuedOn",
    header: "Date",
    cell: ({ row }) => formatDisplayDate(row.original.issuedOn),
  },
  {
    id: "dueOn",
    header: "Due",
    cell: ({ row }) => {
      if (!row.original.dueOn) {
        return "—";
      }
      if (row.original.isOverdue) {
        return (
          <StatusBadge tone="warning">
            {formatDisplayDate(row.original.dueOn)}
          </StatusBadge>
        );
      }
      return formatDisplayDate(row.original.dueOn);
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
    id: "outstanding",
    header: () => <span className="block text-right">Outstanding</span>,
    cell: ({ row }) => (
      <div className="text-right">
        <MoneyDisplay value={row.original.outstanding} />
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const badge = invoicePaymentBadgePresentation(row.original.status);
      return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
    },
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
      enableReorder={false}
    />
  );
}
