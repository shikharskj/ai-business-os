-- CreateTable
CREATE TABLE "supplier_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "paidOn" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "journalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payment_allocations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "supplier_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payment_number_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financialYearKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,

    CONSTRAINT "supplier_payment_number_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_id_tenantId_key" ON "supplier_payments"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_tenantId_number_key" ON "supplier_payments"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_journalId_tenantId_key" ON "supplier_payments"("journalId", "tenantId");

-- CreateIndex
CREATE INDEX "supplier_payments_tenantId_supplierId_idx" ON "supplier_payments"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "supplier_payments_tenantId_paidOn_idx" ON "supplier_payments"("tenantId", "paidOn");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payment_allocations_id_tenantId_key" ON "supplier_payment_allocations"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payment_allocations_paymentId_purchaseId_key" ON "supplier_payment_allocations"("paymentId", "purchaseId");

-- CreateIndex
CREATE INDEX "supplier_payment_allocations_tenantId_purchaseId_idx" ON "supplier_payment_allocations"("tenantId", "purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payment_number_series_tenantId_financialYearKey_key" ON "supplier_payment_number_series"("tenantId", "financialYearKey");

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplierId_tenantId_fkey" FOREIGN KEY ("supplierId", "tenantId") REFERENCES "parties"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_journalId_tenantId_fkey" FOREIGN KEY ("journalId", "tenantId") REFERENCES "journals"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_paymentId_tenantId_fkey" FOREIGN KEY ("paymentId", "tenantId") REFERENCES "supplier_payments"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_purchaseId_tenantId_fkey" FOREIGN KEY ("purchaseId", "tenantId") REFERENCES "purchases"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_number_series" ADD CONSTRAINT "supplier_payment_number_series_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
