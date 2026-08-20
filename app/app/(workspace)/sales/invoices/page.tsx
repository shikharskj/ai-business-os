import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { MoneyDisplay } from "@/components/business/money-display";
import { InvoiceStatusBadge } from "@/components/business/invoice-status-badge";
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
import { INVOICE_STATUSES, listInvoices, invoiceSearchSchema, paymentStatusLabel } from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

const STATUS_FILTER_LABELS: Record<(typeof INVOICE_STATUSES)[number] | "ALL", string> = {
  ALL: "All",
  DRAFT: "Draft",
  POSTED: "Posted",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const tenant = await authorize("invoice:read");
  const params = await searchParams;
  const parseResult = invoiceSearchSchema.safeParse({
    q: params.q,
    status: params.status,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", status: "ALL" as const };
  const canCreate = roleHasPermission(tenant.membership.role, "invoice:create");
  const invoices = await listInvoices({
    tenantId: tenant.tenantId,
    query: filters.q,
    status: filters.status,
    sales: prismaSalesRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Invoices"
        description="Sales invoices with GST. Posting reduces stock and updates accounts."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/sales/invoices/new" />}
            >
              <Plus className="size-5" />
              <span>New invoice</span>
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
            items={STATUS_FILTER_LABELS}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_FILTER_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filters.q || filters.status !== "ALL" ? "No matching invoices" : "No invoices yet"}
          description={
            filters.q || filters.status !== "ALL"
              ? "Try a different number, customer, or status."
              : "Create an invoice to bill a customer. Post when ready to update stock and accounts."
          }
          action={
            canCreate && !filters.q && filters.status === "ALL" ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/sales/invoices/new" />}
              >
                <Plus className="size-5" />
                <span>New invoice</span>
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
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link
                      href={`/app/sales/invoices/${invoice.id}`}
                      className="font-mono text-sm font-medium hover:underline"
                    >
                      {invoice.number}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>{invoice.issuedOn}</TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={invoice.grandTotal} />
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>{paymentStatusLabel(invoice.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
