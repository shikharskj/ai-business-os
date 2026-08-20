"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import {
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUS_TONES,
} from "@/components/business/status-tone";
import { useListTableHref } from "@/components/business/list-table-client";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { Quotation } from "@/modules/sales/domain/types";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type QuotationsDataTableProps = {
  items: Quotation[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, Quotation>[] = [
  {
    accessorKey: "number",
    header: "Number",
    cell: ({ row }) => (
      <Link
        href={`/app/sales/quotations/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "customerName", header: "Customer" },
  { accessorKey: "issuedOn", header: "Date" },
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
      <StatusBadge tone={QUOTATION_STATUS_TONES[row.original.status]}>
        {QUOTATION_STATUS_LABELS[row.original.status]}
      </StatusBadge>
    ),
  },
];

export function QuotationsDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: QuotationsDataTableProps) {
  const buildHref = useListTableHref("/app/sales/quotations", queryString);

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
    />
  );
}
