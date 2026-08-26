-- Domain: snapshot product purchase price onto invoice lines at post for stable COGS.
ALTER TABLE "sales_invoice_lines" ADD COLUMN "unitCost" DECIMAL(18,2);
