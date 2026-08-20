import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authorize } from "@/lib/security";

const reports = [
  {
    href: "/app/reports/sales",
    title: "Sales",
    description: "Posted sales invoices for a date range with taxable, tax, and grand totals.",
  },
  {
    href: "/app/reports/expenses",
    title: "Expenses",
    description: "Business expenses for a date range by category and payment method.",
  },
  {
    href: "/app/reports/profit",
    title: "Profit summary",
    description: "Period sales (taxable) minus expenses — same basis as the dashboard.",
  },
  {
    href: "/app/reports/receivables",
    title: "Receivables",
    description: "Open customer invoice balances from payment allocations.",
  },
  {
    href: "/app/reports/payables",
    title: "Payables",
    description: "Open supplier bill balances from payment allocations.",
  },
  {
    href: "/app/reports/inventory",
    title: "Inventory",
    description: "Stock positions for inventory-tracked products, including low-stock flags.",
  },
  {
    href: "/app/reports/gst",
    title: "GST summary",
    description:
      "Output and input tax for a period from stored invoice, purchase, and expense tax breakdowns.",
  },
  {
    href: "/app/reports/ledger",
    title: "Ledger",
    description: "Account ledger lines from posted journals (same queries as Accounting).",
  },
  {
    href: "/app/reports/trial-balance",
    title: "Trial balance",
    description: "Period trial balance from posted journals (same queries as Accounting).",
  },
];

export default async function ReportsPage() {
  await authorize("report:read");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Business and GST-oriented summaries from posted documents and journals. Reports do not recalculate or mutate financial data."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.href}>
            <CardHeader>
              <CardTitle>
                <Link href={report.href} className="hover:underline">
                  {report.title}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-base text-muted-foreground">
              {report.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
