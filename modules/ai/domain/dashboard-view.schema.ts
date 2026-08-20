import { z } from "zod";

/** Closed set of generative UI component types — unknown types are ignored by the canvas. */
export const DASHBOARD_COMPONENT_TYPES = [
  "MetricCard",
  "AreaChart",
  "BarChart",
  "ActivityList",
  "DataTable",
  "InsightBanner",
  "AlertItem",
  "EmptyState",
] as const;

export type DashboardComponentType = (typeof DASHBOARD_COMPONENT_TYPES)[number];

export const dashboardMoneySchema = z.object({
  amountMinor: z.string().regex(/^-?\d+$/),
  currency: z.string().min(1).default("INR"),
  scale: z.number().int().nonnegative().default(2),
  /** Must cite a Data Fetcher fact id — never invent amounts in the mapper. */
  factId: z.string().min(1),
});

export const dashboardSparklineSchema = z.object({
  factId: z.string().min(1),
  points: z.array(z.number()),
});

export const dashboardTrendSchema = z.object({
  direction: z.enum(["up", "down", "flat"]),
  percentLabel: z.string().nullable(),
  kind: z.enum(["fact", "recommendation"]).default("fact"),
});

export const metricCardComponentSchema = z.object({
  type: z.literal("MetricCard"),
  id: z.string().min(1),
  title: z.string().min(1),
  value: dashboardMoneySchema,
  caption: z.string().optional(),
  tone: z.enum(["neutral", "success", "danger", "warning"]).optional(),
  sparkline: dashboardSparklineSchema.optional(),
  trend: dashboardTrendSchema.optional(),
});

export const chartSeriesSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  factId: z.string().min(1),
  points: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      label: z.string(),
      value: z.number(),
    })
  ),
});

export const areaChartComponentSchema = z.object({
  type: z.literal("AreaChart"),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  summary: z.string().min(1),
  series: z.array(chartSeriesSchema).min(1),
});

export const barChartComponentSchema = z.object({
  type: z.literal("BarChart"),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  summary: z.string().min(1),
  series: z.array(chartSeriesSchema).min(1),
});

export const activityListItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  href: z.string().min(1),
  amount: dashboardMoneySchema.optional(),
  badge: z.string().optional(),
  badgeTone: z.enum(["neutral", "success", "danger", "warning", "info"]).optional(),
});

export const activityListComponentSchema = z.object({
  type: z.literal("ActivityList"),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(activityListItemSchema),
});

export const dataTableComponentSchema = z.object({
  type: z.literal("DataTable"),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  columns: z.array(z.string().min(1)).min(1),
  rows: z.array(z.array(z.string())),
}).superRefine((data, ctx) => {
  for (let i = 0; i < data.rows.length; i++) {
    if (data.rows[i]!.length !== data.columns.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Row ${i} has ${data.rows[i]!.length} cells but expected ${data.columns.length} to match columns`,
        path: ["rows", i],
      });
    }
  }
});

export const insightBannerComponentSchema = z.object({
  type: z.literal("InsightBanner"),
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  href: z.string().optional(),
  severity: z.enum(["info", "warning", "danger"]),
  kind: z.enum(["fact", "recommendation"]),
  dismissible: z.boolean().default(true),
});

export const alertItemComponentSchema = z.object({
  type: z.literal("AlertItem"),
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  href: z.string().min(1),
  severity: z.enum(["info", "warning", "danger"]),
  kind: z.enum(["fact", "recommendation"]),
});

export const emptyStateComponentSchema = z.object({
  type: z.literal("EmptyState"),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  actions: z
    .array(
      z.object({
        label: z.string().min(1),
        href: z.string().min(1),
      })
    )
    .optional(),
});

export const dashboardComponentSchema = z.discriminatedUnion("type", [
  metricCardComponentSchema,
  areaChartComponentSchema,
  barChartComponentSchema,
  activityListComponentSchema,
  dataTableComponentSchema,
  insightBannerComponentSchema,
  alertItemComponentSchema,
  emptyStateComponentSchema,
]);

export const dashboardRegionSchema = z.object({
  id: z.string().min(1),
  layout: z.enum(["grid-4", "grid-2-1", "stack", "toolbar"]),
  components: z.array(dashboardComponentSchema),
});

export const dashboardViewSchema = z.object({
  version: z.literal(1),
  period: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    label: z.string().min(1),
  }),
  source: z.enum(["supervisor", "fallback"]),
  regions: z.array(dashboardRegionSchema).min(1),
});

export type DashboardView = z.infer<typeof dashboardViewSchema>;
export type DashboardComponent = z.infer<typeof dashboardComponentSchema>;
export type DashboardMoneyPayload = z.infer<typeof dashboardMoneySchema>;
export type DashboardRegion = z.infer<typeof dashboardRegionSchema>;

export function parseDashboardView(input: unknown): DashboardView {
  return dashboardViewSchema.parse(input);
}

export function safeParseDashboardView(input: unknown) {
  return dashboardViewSchema.safeParse(input);
}
