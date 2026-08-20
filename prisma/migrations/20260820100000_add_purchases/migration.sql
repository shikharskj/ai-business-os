-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'POSTED', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
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

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
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

    CONSTRAINT "purchase_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_number_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financialYearKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,

    CONSTRAINT "purchase_number_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchases_id_tenantId_key" ON "purchases"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_tenantId_number_key" ON "purchases"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_journalId_tenantId_key" ON "purchases"("journalId", "tenantId");

-- CreateIndex
CREATE INDEX "purchases_tenantId_status_idx" ON "purchases"("tenantId", "status");

-- CreateIndex
CREATE INDEX "purchases_tenantId_supplierId_idx" ON "purchases"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "purchases_tenantId_issuedOn_idx" ON "purchases"("tenantId", "issuedOn");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_lines_id_tenantId_key" ON "purchase_lines"("id", "tenantId");

-- CreateIndex
CREATE INDEX "purchase_lines_tenantId_purchaseId_idx" ON "purchase_lines"("tenantId", "purchaseId");

-- CreateIndex
CREATE INDEX "purchase_lines_purchaseId_sortOrder_idx" ON "purchase_lines"("purchaseId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_number_series_tenantId_financialYearKey_key" ON "purchase_number_series"("tenantId", "financialYearKey");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_tenantId_fkey" FOREIGN KEY ("supplierId", "tenantId") REFERENCES "parties"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_journalId_tenantId_fkey" FOREIGN KEY ("journalId", "tenantId") REFERENCES "journals"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_purchaseId_tenantId_fkey" FOREIGN KEY ("purchaseId", "tenantId") REFERENCES "purchases"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "products"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_number_series" ADD CONSTRAINT "purchase_number_series_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
