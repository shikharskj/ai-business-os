import { defineAiTool } from "@/modules/ai/domain/define-tool";
import {
  lowStockInputSchema,
  lowStockOutputSchema,
} from "@/modules/ai/schemas/ai-tool.schema";
import { getInventoryReport } from "@/modules/reporting";

export const lowStockTool = defineAiTool({
  name: "get_low_stock_products",
  description:
    "Inventory-tracked products at or below the business low-stock threshold, with their current quantity.",
  category: "read",
  permission: "product:read",
  inputSchema: lowStockInputSchema,
  outputSchema: lowStockOutputSchema,
  async execute(input, context) {
    const report = await getInventoryReport({
      tenantId: context.tenantId,
      timezone: context.timezone,
      catalog: context.repositories.catalog,
      inventory: context.repositories.inventory,
      lowStockThresholdMajor: context.lowStockThresholdMajor,
    });

    return {
      asOf: report.asOf,
      lowStockThresholdMajor: context.lowStockThresholdMajor,
      trackedProductCount: report.positionCount,
      lowStockCount: report.lowStockCount,
      products: report.rows
        .filter((row) => row.isLowStock)
        .slice(0, input.limit)
        .map((row) => ({
          productId: row.productId,
          name: row.name,
          sku: row.sku,
          quantityMajor: row.quantityMajor,
        })),
    };
  },
});
