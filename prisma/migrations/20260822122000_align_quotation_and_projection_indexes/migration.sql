-- Align live DB / shadow replay with current schema.prisma:
-- quotation_lines uses a non-unique (quotationId, sortOrder) index.
-- Projection tables do not declare extra (tenantId, …) indexes.
DROP INDEX IF EXISTS "inventory_risk_state_tenantId_lowStockCount_idx";
DROP INDEX IF EXISTS "receivables_risk_state_tenantId_overdueInvoiceCount_idx";
DROP INDEX IF EXISTS "sales_momentum_state_tenantId_windowTo_idx";

DROP INDEX IF EXISTS "quotation_lines_quotationId_sortOrder_idx";
CREATE INDEX "quotation_lines_quotationId_sortOrder_idx" ON "quotation_lines"("quotationId", "sortOrder");
