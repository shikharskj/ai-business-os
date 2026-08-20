import Link from "next/link";

import { PostAdjustmentForm } from "@/components/business/post-adjustment-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { listChartOfAccounts } from "@/modules/accounting";
import { prismaAccountRepository } from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { todayInTimezone } from "@/modules/shared-kernel/dates";

export default async function NewAdjustmentPage() {
  const tenant = await authorize("accounting:post");
  const accounts = await listChartOfAccounts({
    tenantId: tenant.tenantId,
    accounts: prismaAccountRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <PageHeader
        title="Post adjustment"
        description="Create a balanced compensating journal. Posted journals are never edited in place."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/accounting/journals" />}
          >
            Back
          </Button>
        }
      />
      <Card>
        <CardContent>
          <PostAdjustmentForm
            today={todayInTimezone(tenant.business.timezone)}
            accounts={accounts.map((account) => ({
              code: account.code,
              name: account.name,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
