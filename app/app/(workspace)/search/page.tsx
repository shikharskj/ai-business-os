import Link from "next/link";

import { DatePicker } from "@/components/date-picker";
import { EmptyState } from "@/components/shell/empty-state";
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
import { prisma } from "@/lib/db/client";
import { requireCurrentTenant } from "@/lib/tenant/current-tenant";
import {
  createPrismaSearchRepository,
  SEARCH_ENTITY_LABEL,
  SEARCH_ENTITY_TYPES,
  searchBusinessRecords,
  searchQuerySchema,
} from "@/modules/search";
import { businessDate } from "@/modules/shared-kernel/dates";
import { Search } from "lucide-react";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const tenant = await requireCurrentTenant();
  const params = await searchParams;
  const parsed = searchQuerySchema.safeParse({
    q: params.q ?? "",
    type:
      params.type && params.type !== "all" ? params.type : undefined,
    status: params.status,
    from: params.from,
    to: params.to,
    limit: 40,
  });

  const hasQuery = Boolean(params.q?.trim());
  const result =
    hasQuery && parsed.success
      ? await searchBusinessRecords({
          tenantId: tenant.tenantId,
          role: tenant.membership.role,
          query: parsed.data.q,
          type: parsed.data.type,
          status: parsed.data.status,
          fromDate: parsed.data.from
            ? businessDate(parsed.data.from)
            : undefined,
          toDate: parsed.data.to ? businessDate(parsed.data.to) : undefined,
          limit: parsed.data.limit,
          search: createPrismaSearchRepository(prisma),
        })
      : null;

  const typeItems = Object.fromEntries(
    SEARCH_ENTITY_TYPES.map((type) => [type, SEARCH_ENTITY_LABEL[type]])
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
      <PageHeader
        title="Search"
        description="Find customers, suppliers, products, invoices, purchases, payments, and expenses in this business."
      />

      <form className="flex flex-col gap-3" method="get">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-64 flex-1 flex-col gap-2">
            <label htmlFor="q" className="text-base font-medium">
              Query
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Name, number, GSTIN, SKU…"
              autoFocus
            />
          </div>
          <div className="flex w-48 flex-col gap-2">
            <label htmlFor="type" className="text-base font-medium">
              Type
            </label>
            <Select
              name="type"
              defaultValue={params.type ?? "all"}
              items={{ all: "All types", ...typeItems }}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {SEARCH_ENTITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {SEARCH_ENTITY_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex w-40 flex-col gap-2">
            <label htmlFor="status" className="text-base font-medium">
              Status
            </label>
            <Input
              id="status"
              name="status"
              defaultValue={params.status ?? ""}
              placeholder="Optional"
            />
          </div>
          <div className="flex w-44 flex-col gap-2">
            <label htmlFor="from" className="text-base font-medium">
              From
            </label>
            <DatePicker id="from" name="from" defaultValue={params.from} />
          </div>
          <div className="flex w-44 flex-col gap-2">
            <label htmlFor="to" className="text-base font-medium">
              To
            </label>
            <DatePicker id="to" name="to" defaultValue={params.to} />
          </div>
          <Button type="submit">Search</Button>
        </div>
      </form>

      {hasQuery && !parsed.success ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-base text-destructive">
          Enter a search query (1–200 characters).
        </div>
      ) : null}

      {!hasQuery ? (
        <EmptyState
          icon={Search}
          title="Search your business"
          description="Type a customer name, invoice number, product SKU, or other identifier."
        />
      ) : null}

      {result && result.results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description={`Nothing matched “${result.query}” in this business.`}
        />
      ) : null}

      {result && result.results.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {result.results.map((row) => (
            <li key={`${row.entityType}:${row.id}`}>
              <Link
                href={row.href}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{row.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {SEARCH_ENTITY_LABEL[row.entityType]}
                  </span>
                </div>
                <p className="text-base text-muted-foreground">
                  {[row.subtitle, row.status, row.amountLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
