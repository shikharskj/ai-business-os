import Link from "next/link";
import { Banknote, FileText, Receipt, Users } from "lucide-react";

import { MoneyDisplay } from "@/components/business/money-display";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthorizationError } from "@/lib/security/authorize";
import { roleHasPermission, type Permission } from "@/lib/security/permissions";
import { requireCurrentTenant } from "@/lib/tenant/current-tenant";
import { getReceivablesReport } from "@/modules/reporting";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { isInvoiceOverdue } from "@/modules/sales";
import type { SalesInvoiceStatus } from "@/modules/sales/domain/types";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { businessDate } from "@/modules/shared-kernel/dates";

const SALES_READ_PERMISSIONS: Permission[] = [
  "quotation:read",
  "invoice:read",
  "customer:read",
  "payment:read",
];

const LINKS = [
  {
    title: "Quotations",
    description: "Send pricing with GST before billing.",
    href: "/app/sales/quotations",
    icon: Receipt,
    permission: "quotation:read" as const,
  },
  {
    title: "Invoices",
    description: "Bill customers and track receivables.",
    href: "/app/sales/invoices",
    icon: FileText,
    permission: "invoice:read" as const,
  },
  {
    title: "Customers",
    description: "People and businesses you sell to.",
    href: "/app/sales/customers",
    icon: Users,
    permission: "customer:read" as const,
  },
  {
    title: "Payments",
    description: "Record receipts against unpaid invoices.",
    href: "/app/sales/payments",
    icon: Banknote,
    permission: "payment:read" as const,
  },
];

export default async function SalesPage() {
  const tenant = await requireCurrentTenant();
  const canReadSales = SALES_READ_PERMISSIONS.some((permission) =>
    roleHasPermission(tenant.membership.role, permission)
  );
  if (!canReadSales) {
    throw new AuthorizationError("invoice:read");
  }

  const visibleLinks = LINKS.filter((link) =>
    roleHasPermission(tenant.membership.role, link.permission)
  );

  const canReadInvoices = roleHasPermission(
    tenant.membership.role,
    "invoice:read"
  );
  const receivables = canReadInvoices
    ? await getReceivablesReport({
        tenantId: tenant.tenantId,
        timezone: tenant.business.timezone,
        sales: prismaSalesRepository,
        payments: prismaPaymentRepository,
      })
    : null;
  const asOf = receivables ? businessDate(receivables.asOf) : null;
  const overdueCount =
    receivables && asOf
      ? receivables.rows.filter((row) =>
          isInvoiceOverdue({
            dueOn: row.dueOn,
            status: row.status as SalesInvoiceStatus,
            outstandingMinor: row.outstanding.amountMinor,
            asOf,
          })
        ).length
      : 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <PageHeader
        title="Sales"
        description="Quotations, invoices, customers, and customer payments."
      />

      {receivables ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Open receivables</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <MoneyDisplay
                value={receivables.totalOutstanding}
                className="text-2xl font-semibold"
              />
              <p className="text-base text-muted-foreground">
                {receivables.rowCount === 1
                  ? "1 unpaid invoice"
                  : `${receivables.rowCount} unpaid invoices`}
                {overdueCount > 0
                  ? overdueCount === 1
                    ? " · 1 overdue"
                    : ` · ${overdueCount} overdue`
                  : ""}
              </p>
              {overdueCount > 0 ? (
                <Link
                  href="/app/sales/invoices?due=OVERDUE"
                  className="text-sm font-medium hover:underline"
                >
                  View overdue invoices
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {visibleLinks.map((link) => (
          <Link key={link.href} href={link.href} className="group">
            <Card className="h-full transition-colors group-hover:bg-muted/30">
              <CardHeader className="flex flex-row items-start gap-3">
                <link.icon className="mt-0.5 size-5 text-muted-foreground" />
                <div>
                  <CardTitle>{link.title}</CardTitle>
                  <p className="mt-1 text-base text-muted-foreground">
                    {link.description}
                  </p>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
