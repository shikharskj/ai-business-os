import { Plus, Search, Users } from "lucide-react";
import Link from "next/link";

import { CustomersDataTable } from "@/components/business/customers-data-table";
import { EmptyState } from "@/components/shell/empty-state";
import { ListFilterClear } from "@/components/shell/list-filter-clear";
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
import { listCustomersPage, customerSearchSchema } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { outstandingByCustomerIds } from "@/modules/payments";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { money } from "@/modules/shared-kernel/money";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const tenant = await authorize("customer:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const parseResult = customerSearchSchema.safeParse({
    q: params.q,
    status: params.status,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", status: "ACTIVE" as const };
  const canCreate = roleHasPermission(
    tenant.membership.role,
    "customer:create",
  );
  const result = await listCustomersPage({
    tenantId: tenant.tenantId,
    query: filters.q,
    status: filters.status,
    page,
    pageSize,
    parties: prismaPartyRepository,
  });
  const outstandingMap = await outstandingByCustomerIds({
    tenantId: tenant.tenantId,
    customerIds: result.items.map((customer) => customer.id),
    sales: prismaSalesRepository,
    payments: prismaPaymentRepository,
  });
  const rows = result.items.map((customer) => ({
    ...customer,
    outstanding: outstandingMap.get(customer.id) ?? money(0n),
  }));
  const hasFilters = Boolean(filters.q || filters.status !== "ACTIVE");
  const queryString = toQueryString(params);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Customers"
        description="People and businesses you sell to."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/sales/customers/new" />}
            >
              <Plus className="size-5" />
              <span>New customer</span>
            </Button>
          ) : null
        }
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        {pageSize !== 10 ? (
          <input type="hidden" name="pageSize" value={pageSize} />
        ) : null}
        <div className="flex min-w-56 flex-1 flex-col gap-2">
          <label htmlFor="q" className="text-base font-medium">
            Search
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={filters.q}
            placeholder="Name, phone, email, or GSTIN..."
            className="max-w-xl"
            leftIcon={<Search className="size-5" />}
          />
        </div>
        <div className="flex w-40 flex-col gap-2">
          <label htmlFor="status" className="text-base font-medium">
            Status
          </label>
          <Select
            name="status"
            defaultValue={filters.status}
            items={{ ACTIVE: "Active", INACTIVE: "Inactive", ALL: "All" }}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {hasFilters ? <ListFilterClear href="/app/sales/customers" /> : null}
      </form>

      {result.total === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? "No matching customers" : "No customers yet"}
          description={
            hasFilters
              ? "Try a different name, phone, email, or GSTIN."
              : "Add your first customer to start tracking sales and outstanding balances."
          }
          action={
            canCreate && !hasFilters ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/sales/customers/new" />}
              >
                <Plus className="size-5" />
                <span>New customer</span>{" "}
              </Button>
            ) : null
          }
        />
      ) : (
        <CustomersDataTable
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
