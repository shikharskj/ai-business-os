-- Derived FTS support indexes for global search (spec 25).
-- Source tables remain the source of truth; these indexes are rebuildable.

CREATE INDEX IF NOT EXISTS parties_search_fts_idx ON parties
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(name, '') || ' ' ||
      coalesce(gstin, '') || ' ' ||
      coalesce(phone, '') || ' ' ||
      coalesce(email, '')
    )
  );

CREATE INDEX IF NOT EXISTS products_search_fts_idx ON products
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(name, '') || ' ' ||
      coalesce(sku, '') || ' ' ||
      coalesce("hsnSac", '') || ' ' ||
      coalesce(category, '')
    )
  );

CREATE INDEX IF NOT EXISTS sales_invoices_search_fts_idx ON sales_invoices
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' || coalesce("customerName", '')
    )
  );

CREATE INDEX IF NOT EXISTS purchases_search_fts_idx ON purchases
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' || coalesce("supplierName", '')
    )
  );

CREATE INDEX IF NOT EXISTS customer_payments_search_fts_idx ON customer_payments
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' ||
      coalesce("customerName", '') || ' ' ||
      coalesce(reference, '')
    )
  );

CREATE INDEX IF NOT EXISTS supplier_payments_search_fts_idx ON supplier_payments
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' ||
      coalesce("supplierName", '') || ' ' ||
      coalesce(reference, '')
    )
  );

CREATE INDEX IF NOT EXISTS expenses_search_fts_idx ON expenses
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' ||
      coalesce(notes, '') || ' ' ||
      coalesce("vendorGstin", '') || ' ' ||
      coalesce(category::text, '')
    )
  );
