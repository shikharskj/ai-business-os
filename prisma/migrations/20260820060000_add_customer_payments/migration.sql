-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE');

-- CreateTable
CREATE TABLE "customer_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "receivedOn" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "journalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_payment_allocations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "customer_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_payment_number_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financialYearKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,

    CONSTRAINT "customer_payment_number_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_payments_id_tenantId_key" ON "customer_payments"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_payments_tenantId_number_key" ON "customer_payments"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "customer_payments_journalId_tenantId_key" ON "customer_payments"("journalId", "tenantId");

-- CreateIndex
CREATE INDEX "customer_payments_tenantId_customerId_idx" ON "customer_payments"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "customer_payments_tenantId_receivedOn_idx" ON "customer_payments"("tenantId", "receivedOn");

-- CreateIndex
CREATE UNIQUE INDEX "customer_payment_allocations_id_tenantId_key" ON "customer_payment_allocations"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_payment_allocations_paymentId_invoiceId_key" ON "customer_payment_allocations"("paymentId", "invoiceId");

-- CreateIndex
CREATE INDEX "customer_payment_allocations_tenantId_invoiceId_idx" ON "customer_payment_allocations"("tenantId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_payment_number_series_tenantId_financialYearKey_key" ON "customer_payment_number_series"("tenantId", "financialYearKey");

-- AddForeignKey
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_customerId_tenantId_fkey" FOREIGN KEY ("customerId", "tenantId") REFERENCES "parties"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_journalId_tenantId_fkey" FOREIGN KEY ("journalId", "tenantId") REFERENCES "journals"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payment_allocations" ADD CONSTRAINT "customer_payment_allocations_paymentId_tenantId_fkey" FOREIGN KEY ("paymentId", "tenantId") REFERENCES "customer_payments"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payment_allocations" ADD CONSTRAINT "customer_payment_allocations_invoiceId_tenantId_fkey" FOREIGN KEY ("invoiceId", "tenantId") REFERENCES "sales_invoices"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payment_allocations" ADD CONSTRAINT "customer_payment_allocations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payment_number_series" ADD CONSTRAINT "customer_payment_number_series_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
