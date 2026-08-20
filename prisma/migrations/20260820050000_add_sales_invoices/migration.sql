-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('DRAFT', 'POSTED', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "sales_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "quotationId" TEXT,
    "journalId" TEXT,
    "issuedOn" TEXT NOT NULL,
    "dueOn" TEXT,
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

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoice_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
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

    CONSTRAINT "sales_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_number_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financialYearKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,

    CONSTRAINT "invoice_number_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_id_tenantId_key" ON "sales_invoices"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_tenantId_number_key" ON "sales_invoices"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_tenantId_quotationId_key" ON "sales_invoices"("quotationId", "tenantId");

CREATE UNIQUE INDEX "sales_invoices_journalId_tenantId_key" ON "sales_invoices"("journalId", "tenantId");

-- CreateIndex
CREATE INDEX "sales_invoices_tenantId_status_idx" ON "sales_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sales_invoices_tenantId_customerId_idx" ON "sales_invoices"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "sales_invoices_tenantId_issuedOn_idx" ON "sales_invoices"("tenantId", "issuedOn");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoice_lines_id_tenantId_key" ON "sales_invoice_lines"("id", "tenantId");

-- CreateIndex
CREATE INDEX "sales_invoice_lines_tenantId_invoiceId_idx" ON "sales_invoice_lines"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "sales_invoice_lines_invoiceId_sortOrder_idx" ON "sales_invoice_lines"("invoiceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_number_series_tenantId_financialYearKey_key" ON "invoice_number_series"("tenantId", "financialYearKey");

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customerId_tenantId_fkey" FOREIGN KEY ("customerId", "tenantId") REFERENCES "parties"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_quotationId_tenantId_fkey" FOREIGN KEY ("quotationId", "tenantId") REFERENCES "quotations"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_journalId_tenantId_fkey" FOREIGN KEY ("journalId", "tenantId") REFERENCES "journals"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_invoiceId_tenantId_fkey" FOREIGN KEY ("invoiceId", "tenantId") REFERENCES "sales_invoices"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "products"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_number_series" ADD CONSTRAINT "invoice_number_series_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
