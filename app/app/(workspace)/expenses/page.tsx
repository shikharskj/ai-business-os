import { Plus, Search, Wallet } from "lucide-react";
import Link from "next/link";

import { ExpensesDataTable } from "@/components/business/expenses-data-table";
import { EmptyState } from "@/components/shell/empty-state";
import { DatePicker } from "@/components/date-picker";
import {
  ListFilterBar,
  ListFilterField,
  ListFilterSearch,
} from "@/components/shell/list-filter-bar";
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
  EXPENSE_CATEGORY_LABELS,
  expenseSearchSchema,
  listExpensesPage,
} from "@/modules/expenses";
import { prismaExpenseRepository } from "@/modules/expenses/infrastructure/prisma-expenses-repository";
import { businessDate } from "@/modules/shared-kernel/dates";

const CATEGORY_FILTER_LABELS = {
  ALL: "All categories",
  ...EXPENSE_CATEGORY_LABELS,
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const tenant = await authorize("expense:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const parseResult = expenseSearchSchema.safeParse({
    q: params.q,
    category: params.category,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", category: "ALL" as const, from: undefined, to: undefined };
  const canCreate = roleHasPermission(tenant.membership.role, "expense:create");
  const result = await listExpensesPage({
    tenantId: tenant.tenantId,
    query: filters.q,
    category: filters.category === "ALL" ? undefined : filters.category,
    fromDate: filters.from ? businessDate(filters.from) : undefined,
    toDate: filters.to ? businessDate(filters.to) : undefined,
    page,
    pageSize,
    expenses: prismaExpenseRepository,
  });
  const hasFilters = Boolean(
    filters.q || filters.category !== "ALL" || filters.from || filters.to
  );
  const queryString = toQueryString(params);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Expenses"
        description="Record business spend with category, GST, and payment method. Posted expenses update accounts."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/expenses/new" />}
            >
              <Plus className="size-5" />
              <span>Record expense</span>
            </Button>
          ) : null
        }
      />

      <ListFilterBar
        hiddenFields={
          pageSize !== 10 ? (
            <input type="hidden" name="pageSize" value={pageSize} />
          ) : null
        }
        search={
          <ListFilterSearch>
            <label htmlFor="q" className="text-base font-medium">
              Search
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="Number or notes..."
              leftIcon={<Search className="size-5" />}
            />
          </ListFilterSearch>
        }
        filters={
          <>
            <ListFilterField className="md:w-52">
              <label htmlFor="category" className="text-base font-medium">
                Category
              </label>
              <Select
                name="category"
                defaultValue={filters.category}
                items={CATEGORY_FILTER_LABELS}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_FILTER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ListFilterField>
            <ListFilterField className="md:w-44">
              <label htmlFor="from" className="text-base font-medium">
                From
              </label>
              <DatePicker
                id="from"
                name="from"
                defaultValue={filters.from}
                placeholder="From"
              />
            </ListFilterField>
            <ListFilterField className="md:w-44">
              <label htmlFor="to" className="text-base font-medium">
                To
              </label>
              <DatePicker
                id="to"
                name="to"
                defaultValue={filters.to}
                placeholder="To"
              />
            </ListFilterField>
          </>
        }
        actions={
          <Button type="submit" variant="outline">
            Filter
          </Button>
        }
      />

      {result.total === 0 ? (
        <EmptyState
          icon={Wallet}
          title={hasFilters ? "No matching expenses" : "No expenses yet"}
          description={
            hasFilters
              ? "Try a different number, category, or date range."
              : "Record rent, travel, utilities, and other business spend. Each expense posts a balanced journal."
          }
          action={
            canCreate && !hasFilters ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/expenses/new" />}
              >
                <Plus className="size-5" />
                <span>Record expense</span>
              </Button>
            ) : null
          }
        />
      ) : (
        <ExpensesDataTable
          items={result.items}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          queryString={queryString}
        />
      )}
    </div>
  );
}
