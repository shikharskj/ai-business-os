"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { MoneyDisplay } from "@/components/business/money-display";
import { useListTableHref } from "@/components/business/list-table-client";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { CustomerPayment } from "@/modules/payments/domain/types";
import { PAYMENT_METHOD_LABELS } from "@/modules/payments/domain/types";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type PaymentsDataTableProps = {
  items: CustomerPayment[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, CustomerPayment>[] = [
  {
    accessorKey: "number",
    header: "Number",
    cell: ({ row }) => (
      <Link
        href={`/app/sales/payments/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "customerName", header: "Customer" },
  { accessorKey: "receivedOn", header: "Date" },
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => PAYMENT_METHOD_LABELS[row.original.method],
  },
  {
    id: "amount",
    header: () => <span className="block text-right">Amount</span>,
    cell: ({ row }) => (
      <div className="text-right">
        <MoneyDisplay value={row.original.amount} />
      </div>
    ),
  },
];

export function PaymentsDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: PaymentsDataTableProps) {
  const buildHref = useListTableHref("/app/sales/payments", queryString);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      page={page}
      pageSize={pageSize}
      total={total}
      buildHref={buildHref}
      listKey="payments"
      reorderPath="/app/sales/payments"
    />
  );
}
