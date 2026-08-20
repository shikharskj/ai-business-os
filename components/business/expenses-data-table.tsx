"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { MoneyDisplay } from "@/components/business/money-display";
import { useListTableHref } from "@/components/business/list-table-client";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { Expense } from "@/modules/expenses/domain/types";
import { EXPENSE_CATEGORY_LABELS } from "@/modules/expenses/domain/types";
import { PAYMENT_METHOD_LABELS } from "@/modules/payments/domain/types";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type ExpensesDataTableProps = {
  items: Expense[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, Expense>[] = [
  {
    accessorKey: "number",
    header: "Number",
    cell: ({ row }) => (
      <Link
        href={`/app/expenses/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "incurredOn",
    header: "Date",
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => EXPENSE_CATEGORY_LABELS[row.original.category],
  },
  {
    accessorKey: "method",
    header: "Paid by",
    cell: ({ row }) => PAYMENT_METHOD_LABELS[row.original.method],
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
];

export function ExpensesDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: ExpensesDataTableProps) {
  const buildHref = useListTableHref("/app/expenses", queryString);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      page={page}
      pageSize={pageSize}
      total={total}
      buildHref={buildHref}
      listKey="expenses"
      reorderPath="/app/expenses"
    />
  );
}
