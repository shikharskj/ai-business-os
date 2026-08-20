"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import {
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_TONES,
} from "@/components/business/status-tone";
import { useListTableHref } from "@/components/business/list-table-client";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { Purchase } from "@/modules/purchases/domain/types";
import { purchasePaymentStatusLabel } from "@/modules/purchases/domain/status";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type BillsDataTableProps = {
  items: Purchase[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, Purchase>[] = [
  {
    accessorKey: "number",
    header: "Number",
    cell: ({ row }) => (
      <Link
        href={`/app/purchases/bills/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "supplierName", header: "Supplier" },
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
      <StatusBadge tone={PURCHASE_STATUS_TONES[row.original.status]}>
        {PURCHASE_STATUS_LABELS[row.original.status]}
      </StatusBadge>
    ),
  },
  {
    id: "payment",
    header: "Payment",
    cell: ({ row }) => purchasePaymentStatusLabel(row.original.status),
  },
];

export function BillsDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: BillsDataTableProps) {
  const buildHref = useListTableHref("/app/purchases/bills", queryString);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      page={page}
      pageSize={pageSize}
      total={total}
      buildHref={buildHref}
      listKey="bills"
    />
  );
}
