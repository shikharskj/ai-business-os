import type { z } from "zod";

import type { Permission } from "@/lib/security/permissions";
import type { CatalogRepository } from "@/modules/catalog";
import type { ExpenseRepository } from "@/modules/expenses";
import type { InventoryRepository } from "@/modules/inventory";
import type { NotificationRepository } from "@/modules/notifications";
import type { PartyRepository } from "@/modules/party";
import type { PaymentRepository, SupplierPaymentRepository } from "@/modules/payments";
import type { PurchasesRepository } from "@/modules/purchases";
import type { SalesRepository } from "@/modules/sales";
import type { AccountRepository, JournalRepository } from "@/modules/accounting";
import type { AttentionQueueRepository } from "@/modules/business-state/domain/attention-repository";
import type { BusinessStateProjectionRepository } from "@/modules/business-state/domain/projection-repository";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import type {
  AutonomyActionClass,
  AutonomyLevel,
  TenantAutonomyPolicy,
} from "@/modules/tenant/domain/autonomy-policy";
import type { MembershipRole } from "@/modules/tenant/domain/types";

export const AI_TOOL_NAMES = [
  "get_sales_summary",
  "get_expenses_summary",
  "get_outstanding_receivables",
  "get_overdue_invoices",
  "get_low_stock_products",
  "get_business_metrics",
  "get_cash_position",
  "explain_period_movement",
  "send_payment_reminders",
] as const;

export type AiToolName = (typeof AI_TOOL_NAMES)[number];

/** Read tools answer questions; action tools mutate business state (spec 28). */
export type AiToolCategory = "read" | "action";

/**
 * Repositories an AI tool may reach. Tools never receive a Prisma client — they
 * call application use cases which persist through these repositories
 * (ADR-008, invariant 7).
 */
export type AiToolRepositories = {
  sales: SalesRepository;
  purchases: PurchasesRepository;
  expenses: ExpenseRepository;
  payments: PaymentRepository;
  supplierPayments: SupplierPaymentRepository;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
  party: PartyRepository;
  /** Ledger cash/bank reads for get_cash_position (spec 03). */
  accounts: AccountRepository;
  journals: JournalRepository;
  /** Delivery for the confirmed payment-reminder action (spec 28). */
  notifications: NotificationRepository;
  /** Attention outcomes for reminder proposed/sent (spec 04). */
  attention: AttentionQueueRepository;
  /** Derived BusinessState for copilot context assembly (spec 07). */
  projections: BusinessStateProjectionRepository;
  outbox: OutboxRepository;
};

/**
 * Trusted execution context for a tool run. Every field is resolved on the
 * server from the authenticated Clerk session and tenant membership. The model
 * can never supply or influence any of it (invariant 10).
 */
export type AiToolContext = {
  tenantId: string;
  actorUserId: string;
  role: MembershipRole;
  timezone: string;
  currency: string;
  lowStockThresholdMajor: string;
  repositories: AiToolRepositories;
  audit: AuditRepository;
  /** Tenant L0–L4 policy. Missing DB row is represented as L4 off. */
  autonomyPolicy: TenantAutonomyPolicy;
  correlationId?: string;
};

export type AiToolDefinition = {
  name: AiToolName;
  description: string;
  category: AiToolCategory;
  permission: Permission;
  /** Declared default on the ladder. L5 is not representable. */
  autonomyLevel: AutonomyLevel;
  /** Required on action tools that may elevate to L4 under tenant policy. */
  actionClass?: AutonomyActionClass;
  /** High-risk tools must not run before the user confirms (spec 28). */
  requiresConfirmation: boolean;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  /** Validates input, executes the use case, validates output. */
  run(rawInput: unknown, context: AiToolContext): Promise<unknown>;
};

export type AiToolInvocationResult = {
  toolName: AiToolName;
  category: AiToolCategory;
  output: unknown;
  auditRecordId: string;
};

/** Provider-agnostic tool advertisement (JSON Schema parameters). */
export type AiToolSpec = {
  name: AiToolName;
  description: string;
  parameters: Record<string, unknown>;
};
