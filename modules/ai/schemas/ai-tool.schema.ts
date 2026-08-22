import { z } from "zod";

/**
 * Input and output contracts for the AI read tools. These schemas are the tool
 * contract: inputs are validated before a use case runs, outputs are validated
 * before anything reaches the model, and inputs are also the source of the
 * provider-agnostic JSON Schema advertised to the gateway.
 */

/** Money leaves the tool boundary as an exact decimal string, never a float. */
export const moneyViewSchema = z
  .object({
    amountMajor: z.string().regex(/^-?\d+\.\d{2}$/),
    currency: z.string().length(3),
  })
  .strict();

export type MoneyView = z.infer<typeof moneyViewSchema>;

const businessDateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dateRangeViewSchema = z
  .object({
    fromDate: businessDateStringSchema,
    toDate: businessDateStringSchema,
    label: z.string().min(1),
  })
  .strict();

export const AI_TOOL_RANGE_PRESETS = [
  "this_month",
  "last_7_days",
  "last_30_days",
  "last_3_months",
  "custom",
] as const;

export const MAX_AI_TOOL_ROWS = 25;
const DEFAULT_AI_TOOL_ROWS = 10;

const rowLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_AI_TOOL_ROWS)
  .default(DEFAULT_AI_TOOL_ROWS);

/** Shared period selector. `custom` requires both dates. */
export const periodInputSchema = z
  .object({
    preset: z
      .enum(AI_TOOL_RANGE_PRESETS)
      .default("this_month")
      .describe("Reporting period to summarise."),
    fromDate: businessDateStringSchema
      .optional()
      .describe("Start date (YYYY-MM-DD). Required when preset is custom."),
    toDate: businessDateStringSchema
      .optional()
      .describe("End date (YYYY-MM-DD). Required when preset is custom."),
  })
  .strict();

export const salesSummaryInputSchema = periodInputSchema;

export const salesSummaryOutputSchema = z
  .object({
    range: dateRangeViewSchema,
    invoiceCount: z.number().int().nonnegative(),
    totalTaxable: moneyViewSchema,
    totalTax: moneyViewSchema,
    grandTotal: moneyViewSchema,
    largestInvoices: z.array(
      z
        .object({
          invoiceId: z.string().min(1),
          invoiceNumber: z.string().min(1),
          customerName: z.string(),
          issuedOn: businessDateStringSchema,
          status: z.string().min(1),
          grandTotal: moneyViewSchema,
        })
        .strict()
    ),
  })
  .strict();

export const expensesSummaryInputSchema = periodInputSchema;

export const expensesSummaryOutputSchema = z
  .object({
    range: dateRangeViewSchema,
    expenseCount: z.number().int().nonnegative(),
    total: moneyViewSchema,
    totalTax: moneyViewSchema,
    byCategory: z.array(
      z
        .object({
          category: z.string().min(1),
          categoryLabel: z.string().min(1),
          expenseCount: z.number().int().positive(),
          total: moneyViewSchema,
        })
        .strict()
    ),
  })
  .strict();

export const receivablesInputSchema = z
  .object({
    customerId: z
      .string()
      .uuid()
      .optional()
      .describe(
        "Optional customer id from an earlier tool result, to scope the answer to one customer."
      ),
    limit: rowLimitSchema.describe("Maximum number of customers to return."),
  })
  .strict();

export const receivablesOutputSchema = z
  .object({
    asOf: businessDateStringSchema,
    totalOutstanding: moneyViewSchema,
    invoiceCount: z.number().int().nonnegative(),
    customerCount: z.number().int().nonnegative(),
    customers: z.array(
      z
        .object({
          customerId: z.string().min(1),
          customerName: z.string(),
          outstanding: moneyViewSchema,
          invoiceCount: z.number().int().positive(),
          oldestDueOn: businessDateStringSchema.nullable(),
        })
        .strict()
    ),
  })
  .strict();

export const overdueInvoicesInputSchema = z
  .object({
    limit: rowLimitSchema.describe("Maximum number of invoices to return."),
  })
  .strict();

export const overdueInvoicesOutputSchema = z
  .object({
    asOf: businessDateStringSchema,
    invoiceCount: z.number().int().nonnegative(),
    totalOverdue: moneyViewSchema,
    invoices: z.array(
      z
        .object({
          invoiceId: z.string().min(1),
          invoiceNumber: z.string().min(1),
          customerId: z.string().min(1),
          customerName: z.string(),
          dueOn: businessDateStringSchema,
          daysOverdue: z.number().int().positive(),
          outstanding: moneyViewSchema,
        })
        .strict()
    ),
  })
  .strict();

export const lowStockInputSchema = z
  .object({
    limit: rowLimitSchema.describe("Maximum number of products to return."),
  })
  .strict();

export const lowStockOutputSchema = z
  .object({
    asOf: businessDateStringSchema,
    lowStockThresholdMajor: z.string().min(1),
    trackedProductCount: z.number().int().nonnegative(),
    lowStockCount: z.number().int().nonnegative(),
    products: z.array(
      z
        .object({
          productId: z.string().min(1),
          name: z.string().min(1),
          sku: z.string().nullable(),
          quantityMajor: z.string().min(1),
        })
        .strict()
    ),
  })
  .strict();

export const businessMetricsInputSchema = periodInputSchema;

export const businessMetricsOutputSchema = z
  .object({
    range: dateRangeViewSchema,
    revenue: moneyViewSchema,
    expenses: moneyViewSchema,
    profit: moneyViewSchema,
    receivables: moneyViewSchema,
    payables: moneyViewSchema,
    receiptsInPeriod: moneyViewSchema,
    paymentsOutInPeriod: moneyViewSchema,
    overdueInvoiceCount: z.number().int().nonnegative(),
    overdueOutstanding: moneyViewSchema,
    lowStockCount: z.number().int().nonnegative(),
  })
  .strict();

/**
 * The only mutation the assistant can propose. It names invoices, nothing more:
 * amounts, customers, and overdue status are re-derived on the server, so the
 * model can never author the content of a reminder.
 */
export const paymentRemindersInputSchema = z
  .object({
    invoiceIds: z
      .array(z.string().min(1).max(64))
      .min(1)
      .max(10)
      .describe(
        "Ids of overdue invoices from an earlier get_overdue_invoices result."
      ),
  })
  .strict();

export const PAYMENT_REMINDER_STATUSES = [
  "sent",
  "already_sent",
  "not_overdue",
  "not_found",
  "failed",
] as const;

export const paymentRemindersOutputSchema = z
  .object({
    asOf: businessDateStringSchema,
    requestedCount: z.number().int().nonnegative(),
    sentCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    skippedCount: z.number().int().nonnegative(),
    reminders: z.array(
      z
        .object({
          invoiceId: z.string().min(1),
          invoiceNumber: z.string().nullable(),
          customerName: z.string().nullable(),
          outstanding: moneyViewSchema.nullable(),
          daysOverdue: z.number().int().nullable(),
          status: z.enum(PAYMENT_REMINDER_STATUSES),
        })
        .strict()
    ),
  })
  .strict();

const moneyFactViewSchema = moneyViewSchema
  .extend({
    scale: z.number().int().nonnegative(),
    factId: z.string().min(1),
  })
  .strict();

/**
 * Ledger cash/bank balances. The model must use this tool for cash questions —
 * never unpaid invoices or receipts-in-period as a cash substitute.
 */
export const cashPositionInputSchema = z.object({}).strict();

export const cashPositionOutputSchema = z
  .object({
    total: moneyFactViewSchema,
    cash: moneyFactViewSchema,
    bank: moneyFactViewSchema,
    currency: z.string().length(3),
    scale: z.number().int().nonnegative(),
    accounts: z.array(
      z
        .object({
          accountCode: z.string().min(1),
          accountName: z.string().min(1),
          balance: moneyFactViewSchema,
        })
        .strict()
    ),
    computedAt: z.string().min(1),
  })
  .strict();

const movementLineSchema = z
  .object({
    current: moneyViewSchema,
    previous: moneyViewSchema,
    delta: moneyViewSchema,
    direction: z.enum(["up", "down", "flat"]),
  })
  .strict();

export const periodMovementInputSchema = periodInputSchema;

/**
 * Current vs previous period, with application-computed deltas. The model
 * explains this output; it must not invent a prior period or subtract itself.
 */
export const periodMovementOutputSchema = z
  .object({
    currentRange: dateRangeViewSchema,
    previousRange: dateRangeViewSchema,
    revenue: movementLineSchema,
    expenses: movementLineSchema,
    profit: movementLineSchema,
    driver: z
      .object({
        kind: z.enum(["sales", "expenses", "both", "stable"]),
        summary: z.string().min(1),
      })
      .strict(),
    largestInvoices: z.array(
      z
        .object({
          invoiceId: z.string().min(1),
          invoiceNumber: z.string().min(1),
          customerName: z.string(),
          issuedOn: businessDateStringSchema,
          grandTotal: moneyViewSchema,
        })
        .strict()
    ),
    topExpenseCategories: z.array(
      z
        .object({
          category: z.string().min(1),
          categoryLabel: z.string().min(1),
          expenseCount: z.number().int().positive(),
          total: moneyViewSchema,
        })
        .strict()
    ),
    overdueInvoiceCount: z.number().int().nonnegative(),
    overdueOutstanding: moneyViewSchema,
    overdueInvoiceIds: z.array(z.string().min(1)).max(10),
    lowStockCount: z.number().int().nonnegative(),
  })
  .strict();

export type SalesSummaryOutput = z.infer<typeof salesSummaryOutputSchema>;
export type ExpensesSummaryOutput = z.infer<typeof expensesSummaryOutputSchema>;
export type ReceivablesOutput = z.infer<typeof receivablesOutputSchema>;
export type OverdueInvoicesOutput = z.infer<typeof overdueInvoicesOutputSchema>;
export type LowStockOutput = z.infer<typeof lowStockOutputSchema>;
export type BusinessMetricsOutput = z.infer<typeof businessMetricsOutputSchema>;
export type CashPositionOutput = z.infer<typeof cashPositionOutputSchema>;
export type PeriodMovementOutput = z.infer<typeof periodMovementOutputSchema>;
export type PaymentRemindersInput = z.infer<typeof paymentRemindersInputSchema>;
export type PaymentRemindersOutput = z.infer<
  typeof paymentRemindersOutputSchema
>;
