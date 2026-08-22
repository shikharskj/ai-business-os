"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { formatDisplayDate } from "@/components/business/inventory-labels";
import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import {
  SALES_ORDER_STATUS_LABELS,
  SALES_ORDER_STATUS_TONES,
} from "@/components/business/status-tone";
import { useListTableHref } from "@/components/business/list-table-client";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { SalesOrder } from "@/modules/sales/domain/types";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type SalesOrdersDataTableProps = {
  items: SalesOrder[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, SalesOrder>[] = [
  {
    accessorKey: "number",
    header: "Number",
    cell: ({ row }) => (
      <Link
        href={`/app/sales/orders/${row.original.id}`}
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
    id: "expectedOn",
    header: "Expected",
    cell: ({ row }) =>
      row.original.expectedOn ? formatDisplayDate(row.original.expectedOn) : "—",
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
      <StatusBadge tone={SALES_ORDER_STATUS_TONES[row.original.status]}>
        {SALES_ORDER_STATUS_LABELS[row.original.status]}
      </StatusBadge>
    ),
  },
];

export function SalesOrdersDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: SalesOrdersDataTableProps) {
  const buildHref = useListTableHref("/app/sales/orders", queryString);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      page={page}
      pageSize={pageSize}
      total={total}
      buildHref={buildHref}
      listKey="quotations"
      enableReorder={false}
    />
  );
}
