-- Align live DB / shadow replay with current schema.prisma:
-- quotation_lines uses a non-unique (quotationId, sortOrder) index.
-- Projection tables do not declare extra (tenantId, …) indexes.
--
-- IMPORTANT: This migration uses CREATE INDEX CONCURRENTLY / DROP INDEX CONCURRENTLY for non-transactional DDL.
-- Prisma Migrate runs migrations in transactions by default. To apply this migration:
-- 1. Mark it as applied without running: prisma migrate resolve --applied 20260822122000_align_quotation_and_projection_indexes
-- 2. Run each statement manually outside a transaction
-- Or use a custom migration script that executes statements without BEGIN/COMMIT

DROP INDEX IF EXISTS "inventory_risk_state_tenantId_lowStockCount_idx";
DROP INDEX IF EXISTS "receivables_risk_state_tenantId_overdueInvoiceCount_idx";
DROP INDEX IF EXISTS "sales_momentum_state_tenantId_windowTo_idx";

CREATE INDEX CONCURRENTLY IF NOT EXISTS "quotation_lines_quotationId_sortOrder_idx_new" ON "quotation_lines"("quotationId", "sortOrder");
DROP INDEX CONCURRENTLY IF EXISTS "quotation_lines_quotationId_sortOrder_idx";
ALTER INDEX IF EXISTS "quotation_lines_quotationId_sortOrder_idx_new" RENAME TO "quotation_lines_quotationId_sortOrder_idx";
