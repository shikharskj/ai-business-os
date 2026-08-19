import { MVP_CHART_OF_ACCOUNTS } from "@/modules/accounting/domain/chart";
import type { AccountRepository } from "@/modules/accounting/infrastructure/repositories";

export async function ensureChartOfAccounts(input: {
  tenantId: string;
  accountRepository: AccountRepository;
}): Promise<void> {
  await input.accountRepository.ensureChartAccounts(
    MVP_CHART_OF_ACCOUNTS.map((template) => ({
      tenantId: input.tenantId,
      code: template.code,
      name: template.name,
      type: template.type,
      normalBalance: template.normalBalance,
    }))
  );
}
