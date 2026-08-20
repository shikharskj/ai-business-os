-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'UTILITIES', 'TRAVEL', 'OFFICE', 'MARKETING', 'PROFESSIONAL_FEES', 'REPAIRS', 'INSURANCE', 'BANK_CHARGES', 'MEALS', 'SOFTWARE', 'OTHER');

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "incurredOn" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "vendorGstin" TEXT,
    "notes" TEXT,
    "taxableAmount" DECIMAL(18,2) NOT NULL,
    "taxRateBps" INTEGER NOT NULL,
    "cgst" DECIMAL(18,2) NOT NULL,
    "sgst" DECIMAL(18,2) NOT NULL,
    "igst" DECIMAL(18,2) NOT NULL,
    "totalTax" DECIMAL(18,2) NOT NULL,
    "grandTotal" DECIMAL(18,2) NOT NULL,
    "supplyType" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_number_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financialYearKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,

    CONSTRAINT "expense_number_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_id_tenantId_key" ON "expenses"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_tenantId_number_key" ON "expenses"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_journalId_tenantId_key" ON "expenses"("journalId", "tenantId");

-- CreateIndex
CREATE INDEX "expenses_tenantId_category_idx" ON "expenses"("tenantId", "category");

-- CreateIndex
CREATE INDEX "expenses_tenantId_incurredOn_idx" ON "expenses"("tenantId", "incurredOn");

-- CreateIndex
CREATE UNIQUE INDEX "expense_number_series_tenantId_financialYearKey_key" ON "expense_number_series"("tenantId", "financialYearKey");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_journalId_tenantId_fkey" FOREIGN KEY ("journalId", "tenantId") REFERENCES "journals"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_number_series" ADD CONSTRAINT "expense_number_series_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
