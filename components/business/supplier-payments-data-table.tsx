"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { MoneyDisplay } from "@/components/business/money-display";
import { useListTableHref } from "@/components/business/list-table-client";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { SupplierPayment } from "@/modules/payments/domain/types";
import { PAYMENT_METHOD_LABELS } from "@/modules/payments/domain/types";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type SupplierPaymentsDataTableProps = {
  items: SupplierPayment[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, SupplierPayment>[] = [
  {
    accessorKey: "number",
    header: "Number",
    cell: ({ row }) => (
      <Link
        href={`/app/purchases/payments/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "supplierName", header: "Supplier" },
  { accessorKey: "paidOn", header: "Date" },
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

export function SupplierPaymentsDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: SupplierPaymentsDataTableProps) {
  const buildHref = useListTableHref("/app/purchases/payments", queryString);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      page={page}
      pageSize={pageSize}
      total={total}
      buildHref={buildHref}
      listKey="supplier-payments"
    />
  );
}
