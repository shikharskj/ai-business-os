import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { MoneyDisplay } from "@/components/business/money-display";
import { QuotationStatusBadge } from "@/components/business/quotation-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import { listQuotations, quotationSearchSchema } from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const tenant = await authorize("quotation:read");
  const params = await searchParams;
  const parseResult = quotationSearchSchema.safeParse({
    q: params.q,
    status: params.status,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", status: "ALL" as const };
  const canCreate = roleHasPermission(tenant.membership.role, "quotation:create");
  const quotations = await listQuotations({
    tenantId: tenant.tenantId,
    query: filters.q,
    status: filters.status,
    sales: prismaSalesRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Quotations"
        description="Sales quotes with GST preview. Invoices are not created from here yet."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/sales/quotations/new" />}
            >
              <Plus className="size-5" />
              <span>New quotation</span>
            </Button>
          ) : null
        }
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-2">
          <label htmlFor="q" className="text-base font-medium">
            Search
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={filters.q}
            placeholder="Number or customer..."
            className="max-w-xl"
            leftIcon={<Search className="size-5" />}
          />
        </div>
        <div className="flex w-48 flex-col gap-2">
          <label htmlFor="status" className="text-base font-medium">
            Status
          </label>
          <Select
            name="status"
            defaultValue={filters.status}
            items={{
              ALL: "All",
              DRAFT: "Draft",
              SENT: "Sent",
              ACCEPTED: "Accepted",
              CANCELLED: "Cancelled",
              CONVERTED: "Converted",
            }}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="CONVERTED">Converted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {quotations.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filters.q || filters.status !== "ALL" ? "No matching quotations" : "No quotations yet"}
          description={
            filters.q || filters.status !== "ALL"
              ? "Try a different number, customer, or status."
              : "Create a quotation to send pricing with GST to a customer. Stock and accounts stay unchanged."
          }
          action={
            canCreate && !filters.q && filters.status === "ALL" ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/sales/quotations/new" />}
              >
                <Plus className="size-5" />
                <span>New quotation</span>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell>
                    <Link
                      href={`/app/sales/quotations/${quotation.id}`}
                      className="font-mono text-sm font-medium hover:underline"
                    >
                      {quotation.number}
                    </Link>
                  </TableCell>
                  <TableCell>{quotation.customerName}</TableCell>
                  <TableCell>{quotation.issuedOn}</TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={quotation.grandTotal} />
                  </TableCell>
                  <TableCell>
                    <QuotationStatusBadge status={quotation.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
