import Link from "next/link";

import { RecordExpenseForm } from "@/components/business/record-expense-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { todayInTimezone } from "@/modules/shared-kernel/dates";

export default async function NewExpensePage() {
  const tenant = await authorize("expense:create");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <PageHeader
        title="Record expense"
        description="Category, date, amount, optional GST, and how it was paid. Recording posts the journal immediately."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/expenses" />}
          >
            Back to expenses
          </Button>
        }
      />
      <Card>
        <CardContent>
          <RecordExpenseForm today={todayInTimezone(tenant.business.timezone)} />
        </CardContent>
      </Card>
    </div>
  );
}
