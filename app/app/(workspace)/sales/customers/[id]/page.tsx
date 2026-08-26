import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDisplayDate } from "@/components/business/inventory-labels";
import { MoneyDisplay } from "@/components/business/money-display";
import { CustomerDetailMoreMenu } from "@/components/business/customer-detail-more-menu";
import { ReactivateCustomerButton } from "@/components/business/reactivate-customer-button";
import { StatusBadge } from "@/components/business/status-badge";
import {
  invoicePaymentBadgePresentation,
  PARTY_STATUS_LABELS,
  PARTY_STATUS_TONES,
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUS_TONES,
  SALES_ORDER_STATUS_LABELS,
  SALES_ORDER_STATUS_TONES,
} from "@/components/business/status-tone";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getCustomer, PartyNotFoundError } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import {
  getCustomerAdvance,
  getCustomerOutstanding,
  listPaymentsPage,
  PAYMENT_METHOD_LABELS,
} from "@/modules/payments";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { listInvoices, listQuotations, listSalesOrders } from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

const RELATED_LIMIT = 10;

function gstLabel(status: string): string {
  if (status === "REGISTERED") return "Registered";
  if (status === "COMPOSITION") return "Composition";
  return "Not registered";
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const tenant = await authorize("customer:read");
  const { id } = await params;
  const query = await searchParams;
  const canUpdate = roleHasPermission(tenant.membership.role, "customer:update");
  const canCreateInvoice = roleHasPermission(tenant.membership.role, "invoice:create");
  const canCreatePayment = roleHasPermission(tenant.membership.role, "payment:create");

  let customer;
  try {
    customer = await getCustomer({
      tenantId: tenant.tenantId,
      customerId: id,
      parties: prismaPartyRepository,
    });
  } catch (error) {
    if (error instanceof PartyNotFoundError) {
      notFound();
    }
    throw error;
  }

  const address = [
    customer.billingAddressLine1,
    customer.billingAddressLine2,
    [customer.city, customer.state, customer.postalCode]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  const [outstanding, advance] = await Promise.all([
    getCustomerOutstanding({
      tenantId: tenant.tenantId,
      customerId: customer.id,
      sales: prismaSalesRepository,
      payments: prismaPaymentRepository,
    }),
    getCustomerAdvance({
      tenantId: tenant.tenantId,
      customerId: customer.id,
      payments: prismaPaymentRepository,
    }),
  ]);

  const [invoices, quotations, salesOrders, paymentsPage] = await Promise.all([
    listInvoices({
      tenantId: tenant.tenantId,
      customerId: customer.id,
      sales: prismaSalesRepository,
    }),
    listQuotations({
      tenantId: tenant.tenantId,
      customerId: customer.id,
      sales: prismaSalesRepository,
    }),
    listSalesOrders({
      tenantId: tenant.tenantId,
      customerId: customer.id,
      sales: prismaSalesRepository,
    }),
    listPaymentsPage({
      tenantId: tenant.tenantId,
      customerId: customer.id,
      page: 1,
      pageSize: RELATED_LIMIT,
      payments: prismaPaymentRepository,
    }),
  ]);

  const recentInvoices = invoices.slice(0, RELATED_LIMIT);
  const recentQuotations = quotations.slice(0, RELATED_LIMIT);
  const recentSalesOrders = salesOrders.slice(0, RELATED_LIMIT);
  const canRecordPayment =
    canCreatePayment && outstanding.outstanding.amountMinor > 0n;
  const showNewInvoicePrimary =
    !canRecordPayment && canCreateInvoice && customer.status === "ACTIVE";
  const showEditPrimary =
    !canRecordPayment &&
    !showNewInvoicePrimary &&
    canUpdate &&
    customer.status === "ACTIVE";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <PageHeader
        title={customer.name}
        description="Customer profile and sales history"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge tone={PARTY_STATUS_TONES[customer.status]}>
              {PARTY_STATUS_LABELS[customer.status]}
            </StatusBadge>
            {canRecordPayment ? (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/app/sales/payments/new?customerId=${customer.id}`}
                  />
                }
              >
                Record payment
              </Button>
            ) : showNewInvoicePrimary ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/sales/invoices/new" />}
              >
                New invoice
              </Button>
            ) : showEditPrimary ? (
              <Button
                nativeButton={false}
                render={
                  <Link href={`/app/sales/customers/${customer.id}/edit`} />
                }
              >
                Edit
              </Button>
            ) : null}
            <CustomerDetailMoreMenu
              items={[
                { href: "/app/sales/customers", label: "Back to customers" },
                ...(canCreateInvoice &&
                customer.status === "ACTIVE" &&
                canRecordPayment
                  ? [{ href: "/app/sales/invoices/new", label: "New invoice" }]
                  : []),
                ...(canCreatePayment && customer.status === "ACTIVE"
                  ? [
                      {
                        href: `/app/sales/payments/new?advance=1&customerId=${customer.id}`,
                        label: "Record advance",
                      },
                    ]
                  : []),
                ...(canUpdate &&
                customer.status === "ACTIVE" &&
                !showEditPrimary
                  ? [
                      {
                        href: `/app/sales/customers/${customer.id}/edit`,
                        label: "Edit",
                      },
                    ]
                  : []),
              ]}
              deactivate={
                canUpdate && customer.status === "ACTIVE"
                  ? {
                      customerId: customer.id,
                      customerName: customer.name,
                    }
                  : undefined
              }
            />
            {canUpdate && customer.status === "INACTIVE" ? (
              <ReactivateCustomerButton
                customerId={customer.id}
                customerName={customer.name}
              />
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Outstanding</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <MoneyDisplay
            value={outstanding.outstanding}
            className="text-2xl font-semibold"
          />
          <p className="text-base text-muted-foreground">
            {!outstanding.hasPostedInvoices
              ? "No invoices yet"
              : outstanding.outstanding.amountMinor === 0n
                ? "Settled"
                : outstanding.openInvoiceCount === 1
                  ? "1 unpaid invoice"
                  : `${outstanding.openInvoiceCount} unpaid invoices`}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Customer credit</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <MoneyDisplay
            value={advance.unallocated}
            className="text-2xl font-semibold"
          />
          <p className="text-base text-muted-foreground">
            {advance.unallocated.amountMinor === 0n
              ? "No unallocated receipts"
              : advance.receiptCount === 1
                ? "1 receipt on account"
                : `${advance.receiptCount} receipts on account`}
          </p>
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-base sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{customer.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{customer.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">GST registration</p>
            <p>{gstLabel(customer.gstRegistrationStatus)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">GSTIN</p>
            <p className="font-mono text-xs">{customer.gstin ?? "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Billing address</p>
            <p className="whitespace-pre-line">{address || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Recent invoices</CardTitle>
          {invoices.length > RELATED_LIMIT ? (
            <Link
              href={`/app/sales/invoices?customerId=${customer.id}`}
              className="text-sm font-medium hover:underline"
            >
              View all
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recentInvoices.length === 0 ? (
            <p className="px-6 pb-6 text-base text-muted-foreground">
              No invoices yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((invoice) => {
                  const badge = invoicePaymentBadgePresentation(invoice.status);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link
                          href={`/app/sales/invoices/${invoice.id}`}
                          className="font-mono text-sm font-medium hover:underline"
                        >
                          {invoice.number}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDisplayDate(invoice.issuedOn)}</TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay value={invoice.grandTotal} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Recent sales orders</CardTitle>
          {salesOrders.length > RELATED_LIMIT ? (
            <Link
              href={`/app/sales/orders?customerId=${customer.id}`}
              className="text-sm font-medium hover:underline"
            >
              View all
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recentSalesOrders.length === 0 ? (
            <p className="px-6 pb-6 text-base text-muted-foreground">
              No sales orders yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSalesOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/app/sales/orders/${order.id}`}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {order.number}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDisplayDate(order.issuedOn)}</TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay value={order.grandTotal} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={SALES_ORDER_STATUS_TONES[order.status]}>
                        {SALES_ORDER_STATUS_LABELS[order.status]}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Recent quotations</CardTitle>
          {quotations.length > RELATED_LIMIT ? (
            <Link
              href={`/app/sales/quotations?customerId=${customer.id}`}
              className="text-sm font-medium hover:underline"
            >
              View all
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recentQuotations.length === 0 ? (
            <p className="px-6 pb-6 text-base text-muted-foreground">
              No quotations yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentQuotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell>
                      <Link
                        href={`/app/sales/quotations/${quotation.id}`}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {quotation.number}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDisplayDate(quotation.issuedOn)}</TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay value={quotation.grandTotal} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={QUOTATION_STATUS_TONES[quotation.status]}>
                        {QUOTATION_STATUS_LABELS[quotation.status]}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Recent payments</CardTitle>
          {paymentsPage.total > RELATED_LIMIT ? (
            <Link
              href={`/app/sales/payments?customerId=${customer.id}`}
              className="text-sm font-medium hover:underline"
            >
              View all
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {paymentsPage.items.length === 0 ? (
            <p className="px-6 pb-6 text-base text-muted-foreground">
              No payments yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsPage.items.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Link
                        href={`/app/sales/payments/${payment.id}`}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {payment.number}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDisplayDate(payment.receivedOn)}</TableCell>
                    <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay value={payment.amount} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
