import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authorize } from "@/lib/security";

const reports = [
  {
    href: "/app/reports/gst",
    title: "GST summary",
    description:
      "Output and input tax for a period from stored invoice, purchase, and expense tax breakdowns. CSV export included.",
  },
];

export default async function ReportsPage() {
  await authorize("report:read");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="Reports"
        description="GST-oriented summaries and other business reports. Figures come from posted documents — not recalculated here."
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
