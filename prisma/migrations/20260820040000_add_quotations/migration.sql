-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'CANCELLED', 'CONVERTED');

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedOn" TEXT NOT NULL,
    "validUntil" TEXT,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
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

    CONSTRAINT "quotation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_number_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financialYearKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,

    CONSTRAINT "quotation_number_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_id_tenantId_key" ON "quotations"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_tenantId_number_key" ON "quotations"("tenantId", "number");

-- CreateIndex
CREATE INDEX "quotations_tenantId_status_idx" ON "quotations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "quotations_tenantId_customerId_idx" ON "quotations"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "quotations_tenantId_issuedOn_idx" ON "quotations"("tenantId", "issuedOn");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_lines_id_tenantId_key" ON "quotation_lines"("id", "tenantId");

-- CreateIndex
CREATE INDEX "quotation_lines_tenantId_quotationId_idx" ON "quotation_lines"("tenantId", "quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_lines_quotationId_sortOrder_idx" ON "quotation_lines"("quotationId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_number_series_tenantId_financialYearKey_key" ON "quotation_number_series"("tenantId", "financialYearKey");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customerId_tenantId_fkey" FOREIGN KEY ("customerId", "tenantId") REFERENCES "parties"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotationId_tenantId_fkey" FOREIGN KEY ("quotationId", "tenantId") REFERENCES "quotations"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "products"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_number_series" ADD CONSTRAINT "quotation_number_series_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
