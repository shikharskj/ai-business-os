-- Derived FTS support indexes for global search (spec 25).
-- Source tables remain the source of truth; these indexes are rebuildable.
--
-- IMPORTANT: This migration uses CREATE INDEX CONCURRENTLY which cannot run in a transaction.
-- Prisma Migrate runs migrations in transactions by default. To apply this migration:
-- 1. Mark it as applied without running: prisma migrate resolve --applied 20260821010000_add_search_fts_indexes
-- 2. Run each CREATE INDEX statement manually outside a transaction
-- Or use a custom migration script that executes statements without BEGIN/COMMIT

CREATE INDEX CONCURRENTLY IF NOT EXISTS parties_search_fts_idx ON parties
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(name, '') || ' ' ||
      coalesce(gstin, '') || ' ' ||
      coalesce(phone, '') || ' ' ||
      coalesce(email, '')
    )
  );

CREATE INDEX CONCURRENTLY IF NOT EXISTS products_search_fts_idx ON products
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(name, '') || ' ' ||
      coalesce(sku, '') || ' ' ||
      coalesce("hsnSac", '') || ' ' ||
      coalesce(category, '')
    )
  );

CREATE INDEX CONCURRENTLY IF NOT EXISTS sales_invoices_search_fts_idx ON sales_invoices
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' || coalesce("customerName", '')
    )
  );

CREATE INDEX CONCURRENTLY IF NOT EXISTS purchases_search_fts_idx ON purchases
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' || coalesce("supplierName", '')
    )
  );

CREATE INDEX CONCURRENTLY IF NOT EXISTS customer_payments_search_fts_idx ON customer_payments
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' ||
      coalesce("customerName", '') || ' ' ||
      coalesce(reference, '')
    )
  );

CREATE INDEX CONCURRENTLY IF NOT EXISTS supplier_payments_search_fts_idx ON supplier_payments
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' ||
      coalesce("supplierName", '') || ' ' ||
      coalesce(reference, '')
    )
  );

-- ExpenseCategory::text is STABLE, not IMMUTABLE, so it cannot appear in an
-- index expression (PG 42P17). Label CASE is immutable and keeps category tokens.
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
