"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { formatDisplayDate } from "@/components/business/inventory-labels";
import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import { PURCHASE_RETURN_STATUS_TONES } from "@/components/business/status-tone";
import { useListTableHref } from "@/components/business/list-table-client";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { PurchaseReturn } from "@/modules/purchases/domain/types";
import { purchaseReturnStatusLabel } from "@/modules/purchases/domain/purchase-return-status";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type PurchaseReturnsDataTableProps = {
  items: PurchaseReturn[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, PurchaseReturn>[] = [
  {
    accessorKey: "number",
    header: "Number",
    cell: ({ row }) => (
      <Link
        href={`/app/purchases/returns/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "supplierName",
    header: "Supplier",
    cell: ({ row }) => (
      <Link
        href={`/app/purchases/suppliers/${row.original.supplierId}`}
        className="font-medium hover:underline"
      >
        {row.original.supplierName}
      </Link>
    ),
  },
  {
    accessorKey: "purchaseNumber",
    header: "Bill",
    cell: ({ row }) => (
      <Link
        href={`/app/purchases/bills/${row.original.purchaseId}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.purchaseNumber}
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
      <StatusBadge tone={PURCHASE_RETURN_STATUS_TONES[row.original.status]}>
        {purchaseReturnStatusLabel(row.original.status)}
      </StatusBadge>
    ),
  },
];

export function PurchaseReturnsDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: PurchaseReturnsDataTableProps) {
  const buildHref = useListTableHref("/app/purchases/returns", queryString);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      page={page}
      pageSize={pageSize}
      total={total}
      buildHref={buildHref}
      listKey="purchase-returns"
      enableReorder={false}
    />
  );
}
