import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";

import { InvoicesDataTable } from "@/components/business/invoices-data-table";
import { EmptyState } from "@/components/shell/empty-state";
import { ListFilterClear } from "@/components/shell/list-filter-clear";
import { DatePicker } from "@/components/date-picker";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseListTableParams, toQueryString } from "@/lib/list-table-url";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import {
  INVOICE_STATUSES,
  decorateInvoiceListRows,
  listInvoicesPage,
  invoiceSearchSchema,
} from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { businessDate, todayInTimezone } from "@/modules/shared-kernel/dates";

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
  searchParams: Promise<{
    q?: string;
    status?: string;
    due?: string;
    customerId?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const tenant = await authorize("invoice:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const asOf = todayInTimezone(tenant.business.timezone);
  const parseResult = invoiceSearchSchema.safeParse({
    q: params.q,
    status: params.status,
    due: params.due,
    customerId: params.customerId,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  const filters = parseResult.success
    ? parseResult.data
    : {
        q: "",
        status: "ALL" as const,
        due: "ALL" as const,
        customerId: undefined,
        from: undefined,
        to: undefined,
      };
  const canCreate = roleHasPermission(tenant.membership.role, "invoice:create");
  const result = await listInvoicesPage({
    tenantId: tenant.tenantId,
    query: filters.q,
    status: filters.status,
    customerId: filters.customerId,
    due: filters.due,
    overdueAsOf: filters.due === "OVERDUE" ? businessDate(asOf) : undefined,
    fromDate: filters.from ? businessDate(filters.from) : undefined,
    toDate: filters.to ? businessDate(filters.to) : undefined,
    page,
    pageSize,
    sales: prismaSalesRepository,
  });
  const rows = await decorateInvoiceListRows({
    tenantId: tenant.tenantId,
    invoices: result.items,
    payments: prismaPaymentRepository,
    asOf: businessDate(asOf),
  });
  const hasFilters = Boolean(
    filters.q ||
      filters.status !== "ALL" ||
      filters.due !== "ALL" ||
      filters.customerId ||
      filters.from ||
      filters.to
  );
  const queryString = toQueryString(params);

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
        {pageSize !== 10 ? (
          <input type="hidden" name="pageSize" value={pageSize} />
        ) : null}
        {filters.customerId ? (
          <input type="hidden" name="customerId" value={filters.customerId} />
        ) : null}
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
        <div className="flex w-40 flex-col gap-2">
          <label htmlFor="due" className="text-base font-medium">
            Due
          </label>
          <Select
            name="due"
            defaultValue={filters.due}
            items={{ ALL: "All", OVERDUE: "Overdue" }}
          >
            <SelectTrigger id="due" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor="from" className="text-base font-medium">
            From
          </label>
          <DatePicker
            id="from"
            name="from"
            defaultValue={filters.from}
            placeholder="From"
          />
        </div>
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor="to" className="text-base font-medium">
            To
          </label>
          <DatePicker
            id="to"
            name="to"
            defaultValue={filters.to}
            placeholder="To"
          />
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {hasFilters ? <ListFilterClear href="/app/sales/invoices" /> : null}
      </form>

      {result.total === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "No matching invoices" : "No invoices yet"}
          description={
            hasFilters
              ? "Try a different number, customer, status, or date range."
              : "Create an invoice to bill a customer. Post when ready to update stock and accounts."
          }
          action={
            canCreate && !hasFilters ? (
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
        <InvoicesDataTable
          items={rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          queryString={queryString}
        />
      )}
    </div>
  );
}
