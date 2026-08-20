"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { MoneyDisplay } from "@/components/business/money-display";
import { catalogKindPresentation } from "@/components/business/status-tone";
import { useListTableHref } from "@/components/business/list-table-client";
import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import type { Product } from "@/modules/catalog/domain/types";
import type { PageSize } from "@/modules/shared-kernel/list-page";

type ProductsDataTableProps = {
  items: Product[];
  total: number;
  page: number;
  pageSize: PageSize;
  queryString: string;
};

const columns: ColumnDef<DataTableFeatures, Product>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/app/inventory/products/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "sku", header: "SKU" },
  {
    accessorKey: "kind",
    header: "Type",
    cell: ({ row }) => {
      const kind = catalogKindPresentation(row.original.kind);
      return <span>{kind.label}</span>;
    },
  },
  {
    id: "sellingPrice",
    header: () => <span className="block text-right">Selling price</span>,
    cell: ({ row }) => (
      <div className="text-right">
        <MoneyDisplay value={row.original.sellingPrice} />
      </div>
    ),
  },
  {
    accessorKey: "tracksInventory",
    header: "Stock",
    cell: ({ row }) => (row.original.tracksInventory ? "Tracked" : "Not tracked"),
  },
];

export function ProductsDataTable({
  items,
  total,
  page,
  pageSize,
  queryString,
}: ProductsDataTableProps) {
  const buildHref = useListTableHref("/app/inventory/products", queryString);

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      page={page}
      pageSize={pageSize}
      total={total}
      buildHref={buildHref}
      listKey="products"
    />
  );
}
