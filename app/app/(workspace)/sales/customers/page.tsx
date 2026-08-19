import { Users } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
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
import { listCustomers, customerSearchSchema } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const tenant = await authorize("customer:read");
  const params = await searchParams;
  const filters = customerSearchSchema.parse({
    q: params.q,
    status: params.status,
  });
  const canCreate = roleHasPermission(tenant.membership.role, "customer:create");
  const customers = await listCustomers({
    tenantId: tenant.tenantId,
    query: filters.q,
    status: filters.status,
    parties: prismaPartyRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Customers"
        description="People and businesses you sell to."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/sales/customers/new" />}
            >
              New customer
            </Button>
          ) : null
        }
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-2">
          <label htmlFor="q" className="text-sm font-medium">
            Search
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={filters.q}
            placeholder="Name, phone, email, or GSTIN"
          />
        </div>
        <div className="flex w-40 flex-col gap-2">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <Select name="status" defaultValue={filters.status}>
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
      </form>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filters.q ? "No matching customers" : "No customers yet"}
          description={
            filters.q
              ? "Try a different name, phone, email, or GSTIN."
              : "Add your first customer to start tracking sales and outstanding balances."
          }
          action={
            canCreate ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/sales/customers/new" />}
              >
                New customer
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link
                      href={`/app/sales/customers/${customer.id}`}
                      className="font-medium hover:underline"
                    >
                      {customer.name}
                    </Link>
                    {customer.email ? (
                      <p className="text-xs text-muted-foreground">
                        {customer.email}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {customer.gstin ?? "—"}
                  </TableCell>
                  <TableCell>{customer.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        customer.status === "ACTIVE" ? "secondary" : "outline"
                      }
                    >
                      {customer.status === "ACTIVE" ? "Active" : "Inactive"}
                    </Badge>
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
