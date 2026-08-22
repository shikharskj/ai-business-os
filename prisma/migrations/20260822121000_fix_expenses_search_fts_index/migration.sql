-- Expenses FTS GIN index was skipped on databases where
-- 20260821010000_add_search_fts_indexes was marked applied: ExpenseCategory::text
-- is not IMMUTABLE. Recreate with an immutable CASE of enum labels.
--
-- IMPORTANT: This migration uses CREATE INDEX CONCURRENTLY which cannot run in a transaction.
-- Prisma Migrate runs migrations in transactions by default. To apply this migration:
-- 1. Mark it as applied without running: prisma migrate resolve --applied 20260822121000_fix_expenses_search_fts_index
-- 2. Run the CREATE INDEX statement manually outside a transaction
-- Or use a custom migration script that executes statements without BEGIN/COMMIT

CREATE INDEX CONCURRENTLY IF NOT EXISTS expenses_search_fts_idx ON expenses
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' ||
      coalesce(notes, '') || ' ' ||
      coalesce("vendorGstin", '') || ' ' ||
      coalesce(
        CASE category
          WHEN 'RENT' THEN 'RENT'
          WHEN 'UTILITIES' THEN 'UTILITIES'
          WHEN 'TRAVEL' THEN 'TRAVEL'
          WHEN 'OFFICE' THEN 'OFFICE'
          WHEN 'MARKETING' THEN 'MARKETING'
          WHEN 'PROFESSIONAL_FEES' THEN 'PROFESSIONAL_FEES'
          WHEN 'REPAIRS' THEN 'REPAIRS'
          WHEN 'INSURANCE' THEN 'INSURANCE'
          WHEN 'BANK_CHARGES' THEN 'BANK_CHARGES'
          WHEN 'MEALS' THEN 'MEALS'
          WHEN 'SOFTWARE' THEN 'SOFTWARE'
          WHEN 'OTHER' THEN 'OTHER'
        END,
        ''
      )
    )
  );
