-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseReturnStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "journalId" TEXT,
    "issuedOn" TEXT NOT NULL,
    "notes" TEXT,
    "placeOfSupplyStateCode" TEXT NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "discountTotal" DECIMAL(18,2) NOT NULL,
    "taxableAmount" DECIMAL(18,2) NOT NULL,
    "cgst" DECIMAL(18,2) NOT NULL,
    "sgst" DECIMAL(18,2) NOT NULL,
    "igst" DECIMAL(18,2) NOT NULL,
    "totalTax" DECIMAL(18,2) NOT NULL,
    "grandTotal" DECIMAL(18,2) NOT NULL,
    "supplyType" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "sourceInvoiceLineId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unitOfMeasurement" TEXT NOT NULL,
    "hsnSac" TEXT,
    "taxRateBps" INTEGER NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL,
    "lineSubtotal" DECIMAL(18,2) NOT NULL,
    "taxableAmount" DECIMAL(18,2) NOT NULL,
    "cgst" DECIMAL(18,2) NOT NULL,
    "sgst" DECIMAL(18,2) NOT NULL,
    "igst" DECIMAL(18,2) NOT NULL,
    "totalTax" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "supplyType" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,

    CONSTRAINT "credit_note_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_number_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financialYearKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,

    CONSTRAINT "credit_note_number_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_returns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "status" "PurchaseReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "journalId" TEXT,
    "issuedOn" TEXT NOT NULL,
    "notes" TEXT,
    "placeOfSupplyStateCode" TEXT NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "discountTotal" DECIMAL(18,2) NOT NULL,
    "taxableAmount" DECIMAL(18,2) NOT NULL,
    "cgst" DECIMAL(18,2) NOT NULL,
    "sgst" DECIMAL(18,2) NOT NULL,
    "igst" DECIMAL(18,2) NOT NULL,
    "totalTax" DECIMAL(18,2) NOT NULL,
    "grandTotal" DECIMAL(18,2) NOT NULL,
    "supplyType" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_return_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseReturnId" TEXT NOT NULL,
    "sourcePurchaseLineId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unitOfMeasurement" TEXT NOT NULL,
    "hsnSac" TEXT,
    "taxRateBps" INTEGER NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL,
    "lineSubtotal" DECIMAL(18,2) NOT NULL,
    "taxableAmount" DECIMAL(18,2) NOT NULL,
    "cgst" DECIMAL(18,2) NOT NULL,
    "sgst" DECIMAL(18,2) NOT NULL,
    "igst" DECIMAL(18,2) NOT NULL,
    "totalTax" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "supplyType" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,

    CONSTRAINT "purchase_return_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_return_number_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financialYearKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,

    CONSTRAINT "purchase_return_number_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_id_tenantId_key" ON "credit_notes"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_tenantId_number_key" ON "credit_notes"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_journalId_tenantId_key" ON "credit_notes"("journalId", "tenantId");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_status_idx" ON "credit_notes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_customerId_idx" ON "credit_notes"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_invoiceId_idx" ON "credit_notes"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_issuedOn_idx" ON "credit_notes"("tenantId", "issuedOn");

-- CreateIndex
CREATE UNIQUE INDEX "credit_note_lines_id_tenantId_key" ON "credit_note_lines"("id", "tenantId");

-- CreateIndex
CREATE INDEX "credit_note_lines_tenantId_creditNoteId_idx" ON "credit_note_lines"("tenantId", "creditNoteId");

-- CreateIndex
CREATE INDEX "credit_note_lines_creditNoteId_sortOrder_idx" ON "credit_note_lines"("creditNoteId", "sortOrder");

-- CreateIndex
CREATE INDEX "credit_note_lines_tenantId_sourceInvoiceLineId_idx" ON "credit_note_lines"("tenantId", "sourceInvoiceLineId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_note_number_series_tenantId_financialYearKey_key" ON "credit_note_number_series"("tenantId", "financialYearKey");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_returns_id_tenantId_key" ON "purchase_returns"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_returns_tenantId_number_key" ON "purchase_returns"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_returns_journalId_tenantId_key" ON "purchase_returns"("journalId", "tenantId");

-- CreateIndex
CREATE INDEX "purchase_returns_tenantId_status_idx" ON "purchase_returns"("tenantId", "status");

-- CreateIndex
CREATE INDEX "purchase_returns_tenantId_supplierId_idx" ON "purchase_returns"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "purchase_returns_tenantId_purchaseId_idx" ON "purchase_returns"("tenantId", "purchaseId");

-- CreateIndex
CREATE INDEX "purchase_returns_tenantId_issuedOn_idx" ON "purchase_returns"("tenantId", "issuedOn");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_return_lines_id_tenantId_key" ON "purchase_return_lines"("id", "tenantId");

-- CreateIndex
CREATE INDEX "purchase_return_lines_tenantId_purchaseReturnId_idx" ON "purchase_return_lines"("tenantId", "purchaseReturnId");

-- CreateIndex
CREATE INDEX "purchase_return_lines_purchaseReturnId_sortOrder_idx" ON "purchase_return_lines"("purchaseReturnId", "sortOrder");

-- CreateIndex
CREATE INDEX "purchase_return_lines_tenantId_sourcePurchaseLineId_idx" ON "purchase_return_lines"("tenantId", "sourcePurchaseLineId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_return_number_series_tenantId_financialYearKey_key" ON "purchase_return_number_series"("tenantId", "financialYearKey");

-- CreateIndex
CREATE INDEX "credit_notes_search_fts_idx" ON "credit_notes"
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' || coalesce("customerName", '') || ' ' || coalesce("invoiceNumber", '')
    )
  );

-- CreateIndex
CREATE INDEX "purchase_returns_search_fts_idx" ON "purchase_returns"
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' || coalesce("supplierName", '') || ' ' || coalesce("purchaseNumber", '')
    )
  );

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_customerId_tenantId_fkey" FOREIGN KEY ("customerId", "tenantId") REFERENCES "parties"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoiceId_tenantId_fkey" FOREIGN KEY ("invoiceId", "tenantId") REFERENCES "sales_invoices"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_journalId_tenantId_fkey" FOREIGN KEY ("journalId", "tenantId") REFERENCES "journals"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "credit_note_lines_creditNoteId_tenantId_fkey" FOREIGN KEY ("creditNoteId", "tenantId") REFERENCES "credit_notes"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "credit_note_lines_sourceInvoiceLineId_tenantId_fkey" FOREIGN KEY ("sourceInvoiceLineId", "tenantId") REFERENCES "sales_invoice_lines"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "credit_note_lines_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "products"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "credit_note_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_number_series" ADD CONSTRAINT "credit_note_number_series_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_supplierId_tenantId_fkey" FOREIGN KEY ("supplierId", "tenantId") REFERENCES "parties"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_purchaseId_tenantId_fkey" FOREIGN KEY ("purchaseId", "tenantId") REFERENCES "purchases"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_journalId_tenantId_fkey" FOREIGN KEY ("journalId", "tenantId") REFERENCES "journals"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "purchase_return_lines_purchaseReturnId_tenantId_fkey" FOREIGN KEY ("purchaseReturnId", "tenantId") REFERENCES "purchase_returns"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "purchase_return_lines_sourcePurchaseLineId_tenantId_fkey" FOREIGN KEY ("sourcePurchaseLineId", "tenantId") REFERENCES "purchase_lines"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "purchase_return_lines_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "products"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "purchase_return_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_number_series" ADD CONSTRAINT "purchase_return_number_series_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
