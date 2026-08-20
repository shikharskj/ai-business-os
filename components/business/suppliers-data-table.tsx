"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { useListTableHref } from "@/components/business/list-table-client";
import { StatusBadge } from "@/components/business/status-badge";
import {
  PARTY_STATUS_LABELS,
  PARTY_STATUS_TONES,
} from "@/components/business/status-tone";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { Supplier } from "@/modules/party/domain/types";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type SuppliersDataTableProps = {
  items: Supplier[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, Supplier>[] = [
  {
    accessorKey: "name",
    header: "Supplier",
    cell: ({ row }) => (
      <div>
        <Link
          href={`/app/purchases/suppliers/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
        {row.original.email ? (
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "gstin",
    header: "GSTIN",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.gstin ?? "—"}</span>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.original.phone ?? "—",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge tone={PARTY_STATUS_TONES[row.original.status]}>
        {PARTY_STATUS_LABELS[row.original.status]}
      </StatusBadge>
    ),
  },
];

export function SuppliersDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: SuppliersDataTableProps) {
  const buildHref = useListTableHref("/app/purchases/suppliers", queryString);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      page={page}
      pageSize={pageSize}
      total={total}
      buildHref={buildHref}
      listKey="suppliers"
      reorderPath="/app/purchases/suppliers"
    />
  );
}
