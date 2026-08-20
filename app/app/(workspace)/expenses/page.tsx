import { Plus, Search, Wallet } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { MoneyDisplay } from "@/components/business/money-display";
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
import {
  EXPENSE_CATEGORY_LABELS,
  expenseSearchSchema,
  listExpenses,
} from "@/modules/expenses";
import { prismaExpenseRepository } from "@/modules/expenses/infrastructure/prisma-expenses-repository";
import { PAYMENT_METHOD_LABELS } from "@/modules/payments";
import { businessDate } from "@/modules/shared-kernel/dates";

const CATEGORY_FILTER_LABELS = {
  ALL: "All categories",
  ...EXPENSE_CATEGORY_LABELS,
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; from?: string; to?: string }>;
}) {
  const tenant = await authorize("expense:read");
  const params = await searchParams;
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
  const expenses = await listExpenses({
    tenantId: tenant.tenantId,
    query: filters.q,
    category: filters.category === "ALL" ? undefined : filters.category,
    fromDate: filters.from ? businessDate(filters.from) : undefined,
    toDate: filters.to ? businessDate(filters.to) : undefined,
    expenses: prismaExpenseRepository,
  });
  const hasFilters = Boolean(
    filters.q || filters.category !== "ALL" || filters.from || filters.to
  );

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

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-2">
          <label htmlFor="q" className="text-base font-medium">
            Search
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={filters.q}
            placeholder="Number or notes..."
            className="max-w-xl"
            leftIcon={<Search className="size-5" />}
          />
        </div>
        <div className="flex w-52 flex-col gap-2">
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
        </div>
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor="from" className="text-base font-medium">
            From
          </label>
          <Input
            id="from"
            name="from"
            type="date"
            defaultValue={filters.from ?? ""}
          />
        </div>
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor="to" className="text-base font-medium">
            To
          </label>
          <Input
            id="to"
            name="to"
            type="date"
            defaultValue={filters.to ?? ""}
          />
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {expenses.length === 0 ? (
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
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <Link
                      href={`/app/expenses/${expense.id}`}
                      className="font-mono text-sm font-medium hover:underline"
                    >
                      {expense.number}
                    </Link>
                  </TableCell>
                  <TableCell>{expense.incurredOn}</TableCell>
                  <TableCell>{EXPENSE_CATEGORY_LABELS[expense.category]}</TableCell>
                  <TableCell>{PAYMENT_METHOD_LABELS[expense.method]}</TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={expense.grandTotal} />
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
