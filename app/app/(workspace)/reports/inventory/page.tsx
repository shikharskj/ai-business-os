import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireReportTenant } from "@/lib/reports/report-range";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { getInventoryReport } from "@/modules/reporting";

export default async function InventoryReportPage() {
  const tenant = await requireReportTenant();
  const report = await getInventoryReport({
    tenantId: tenant.tenantId,
    timezone: tenant.business.timezone,
    catalog: prismaCatalogRepository,
    inventory: prismaInventoryRepository,
    lowStockThresholdMajor: tenant.business.lowStockThreshold,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="Inventory report"
        description="Current stock positions for inventory-tracked products. Low-stock uses the business threshold."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} variant="outline" render={<Link href="/app/reports" />}>
              Back
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<a href="/api/reports/inventory/export" />}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      <p className="text-base text-muted-foreground">
        As of{" "}
        <span className="font-mono text-foreground">{report.asOf}</span>
        {" · "}
        {report.positionCount} product{report.positionCount === 1 ? "" : "s"}
        {" · "}
        {report.lowStockCount} low stock
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No inventory-tracked products.
              </TableCell>
            </TableRow>
          ) : (
            report.rows.map((row) => (
              <TableRow key={row.productId}>
                <TableCell>
                  <Link
                    href={`/app/inventory/products/${row.productId}`}
                    className="font-medium hover:underline"
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-sm">{row.sku ?? "—"}</TableCell>
                <TableCell className="text-right font-mono">{row.quantityMajor}</TableCell>
                <TableCell>{row.isLowStock ? "Low stock" : "OK"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
