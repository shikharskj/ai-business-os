import { roleHasPermission } from "@/lib/security/permissions";
import { countOpenAttentionByType } from "@/modules/business-state/application/build-daily-brief";
import { getBusinessStateSummary } from "@/modules/business-state/application/get-business-state";
import { listOpenAttention } from "@/modules/business-state/application/list-open-attention";
import type {
  AttentionItem,
  BusinessStateSummary,
} from "@/modules/business-state/domain/types";
import { AI_SYSTEM_POLICY } from "@/modules/ai/domain/system-policy";
import type { AiToolContext } from "@/modules/ai/domain/tool-types";
import { wrapUntrustedContent } from "@/modules/ai/domain/untrusted-content";

const MAX_ATTENTION_LINES = 8;

const IDENTITY_CONTEXT = [
  "Execution context:",
  "- You are answering for the signed-in member of the current business.",
  "- Do not request or accept tenant, user, role, or permission identifiers; they are already resolved on the server.",
  "- Prefer tools for verified numbers. Use the BusinessState summary only to see what currently needs attention.",
].join("\n");

export type AssembledAssistantContext = {
  system: string;
  includedState: boolean;
};

/**
 * Context assembly order (architecture): trusted identity → BusinessState /
 * Attention summaries → (tools later) → sanitized conversation.
 *
 * State is fenced as untrusted data. Projection amounts are omitted so the
 * model cannot treat derived money as ledger truth.
 */
export async function assembleAssistantContext(
  context: AiToolContext
): Promise<AssembledAssistantContext> {
  const prefix = `${AI_SYSTEM_POLICY}\n\n${IDENTITY_CONTEXT}`;

  if (!roleHasPermission(context.role, "report:read")) {
    return { system: prefix, includedState: false };
  }

  try {
    const [summary, attention] = await Promise.all([
      getBusinessStateSummary({
        tenantId: context.tenantId,
        projections: context.repositories.projections,
        attention: context.repositories.attention,
      }),
      listOpenAttention({
        tenantId: context.tenantId,
        attention: context.repositories.attention,
      }),
    ]);

    const body = formatBusinessStateContextSummary({ summary, attention });
    return {
      system: `${prefix}\n\n${wrapUntrustedContent({
        label: "business-state",
        content: body,
      })}`,
      includedState: true,
    };
  } catch {
    return { system: prefix, includedState: false };
  }
}

export function formatBusinessStateContextSummary(input: {
  summary: BusinessStateSummary;
  attention: AttentionItem[];
}): string {
  const lines: string[] = [
    "Derived BusinessState / AttentionQueue summary. Not ledger truth. Call tools for verified numbers.",
  ];

  const { summary, attention } = input;
  const counts = countOpenAttentionByType(attention);
  lines.push(
    `Open attention: ${summary.attention.openCount} (overdue ${counts.overdue}, low stock ${counts.lowStock}, idle quotes ${counts.idleQuotation}, unusual expenses ${counts.unusualExpense}).`
  );

  if (attention.length === 0) {
    lines.push("No open attention items.");
  } else {
    lines.push("Top attention (type + title, no amounts):");
    for (const item of attention.slice(0, MAX_ATTENTION_LINES)) {
      lines.push(`- ${item.type}: ${item.title}`);
    }
  }

  if (summary.receivablesRisk) {
    lines.push(
      `Receivables risk: ${summary.receivablesRisk.openInvoiceCount} open invoices, ${summary.receivablesRisk.overdueInvoiceCount} overdue.`
    );
  } else {
    lines.push("Receivables risk projection: not built.");
  }

  if (summary.inventoryRisk) {
    lines.push(
      `Inventory risk: ${summary.inventoryRisk.lowStockCount} products below threshold.`
    );
  } else {
    lines.push("Inventory risk projection: not built.");
  }

  if (summary.salesMomentum) {
    lines.push(
      `Sales momentum (${summary.salesMomentum.windowDays}d): ${summary.salesMomentum.postedInvoiceCount} posted invoices.`
    );
  } else {
    lines.push("Sales momentum projection: not built.");
  }

  lines.push(
    summary.cashPosition
      ? "Cash position projection is present. Use get_cash_position for ledger cash/bank amounts."
      : "Cash position projection: not built. Use get_cash_position for ledger cash/bank amounts."
  );

  return lines.join("\n");
}
