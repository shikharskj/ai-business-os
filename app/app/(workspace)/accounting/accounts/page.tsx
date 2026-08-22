import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authorize } from "@/lib/security";
import { listChartOfAccounts } from "@/modules/accounting";
import { prismaAccountRepository } from "@/modules/accounting/infrastructure/prisma-accounting-repositories";

const TYPE_LABELS = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
} as const;

export default async function ChartOfAccountsPage() {
  const tenant = await authorize("report:read");
  const accounts = await listChartOfAccounts({
    tenantId: tenant.tenantId,
    accounts: prismaAccountRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="Chart of accounts"
        description="Per-tenant chart used by the posting service. Accounts are not edited from this screen."
      />

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Normal balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-mono text-sm">{account.code}</TableCell>
                <TableCell>
                  <Link
                    href={`/app/accounting/ledger?accountId=${account.id}`}
                    className="font-medium hover:underline"
                  >
                    {account.name}
                  </Link>
                </TableCell>
                <TableCell>{TYPE_LABELS[account.type]}</TableCell>
                <TableCell className="capitalize">
                  {account.normalBalance.toLowerCase()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
