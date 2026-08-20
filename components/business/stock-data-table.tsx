"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { stockStatusPresentation } from "@/components/business/status-tone";
import { useListTableHref } from "@/components/business/list-table-client";
import { StatusBadge } from "@/components/business/status-badge";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { StockPosition } from "@/modules/inventory/domain/types";
import { formatQuantity } from "@/modules/inventory/domain/quantity";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type StockDataTableProps = {
  items: StockPosition[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, StockPosition>[] = [
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }) => (
      <Link
        href={`/app/inventory/stock/${row.original.productId}`}
        className="font-medium hover:underline"
      >
        {row.original.productName}
      </Link>
    ),
  },
  { accessorKey: "sku", header: "SKU" },
  {
    id: "quantity",
    header: () => <span className="block text-right">On hand</span>,
    cell: ({ row }) => (
      <div className="text-right font-mono text-sm">
        {row.original.quantity
          ? formatQuantity(row.original.quantity)
          : "—"}
      </div>
    ),
  },
  {
    id: "lowStock",
    header: "Status",
    cell: ({ row }) => {
      const stock = stockStatusPresentation({
        isLowStock: row.original.isLowStock,
        hasMovements: row.original.hasMovements,
      });
      return <StatusBadge tone={stock.tone}>{stock.label}</StatusBadge>;
    },
  },
];

export function StockDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: StockDataTableProps) {
  const buildHref = useListTableHref("/app/inventory/stock", queryString);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.productId}
      page={page}
      pageSize={pageSize}
      total={total}
      buildHref={buildHref}
      listKey="stock"
      reorderPath="/app/inventory/stock"
    />
  );
}
