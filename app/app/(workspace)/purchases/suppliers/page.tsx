import { Plus, Search, Truck } from "lucide-react";
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
import { listSuppliers, supplierSearchSchema } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const tenant = await authorize("supplier:read");
  const params = await searchParams;
  const parseResult = supplierSearchSchema.safeParse({
    q: params.q,
    status: params.status,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", status: "ACTIVE" as const };
  const canCreate = roleHasPermission(
    tenant.membership.role,
    "supplier:create",
  );
  const suppliers = await listSuppliers({
    tenantId: tenant.tenantId,
    query: filters.q,
    status: filters.status,
    parties: prismaPartyRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Suppliers"
        description="People and businesses you buy from."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/purchases/suppliers/new" />}
            >
              <Plus className="size-5" />
              <span>New supplier</span>
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
      </form>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={
            filters.q || filters.status !== "ACTIVE"
              ? "No matching suppliers"
              : "No suppliers yet"
          }
          description={
            filters.q || filters.status !== "ACTIVE"
              ? "Try a different name, phone, email, or GSTIN."
              : "Add your first supplier to start tracking purchases and payables."
          }
          action={
            canCreate && !filters.q && filters.status === "ACTIVE" ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/purchases/suppliers/new" />}
              >
                <Plus className="size-5" />
                <span>New supplier</span>{" "}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <Link
                      href={`/app/purchases/suppliers/${supplier.id}`}
                      className="font-medium hover:underline"
                    >
                      {supplier.name}
                    </Link>
                    {supplier.email ? (
                      <p className="text-xs text-muted-foreground">
                        {supplier.email}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {supplier.gstin ?? "—"}
                  </TableCell>
                  <TableCell>{supplier.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        supplier.status === "ACTIVE" ? "secondary" : "outline"
                      }
                    >
                      {supplier.status === "ACTIVE" ? "Active" : "Inactive"}
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
