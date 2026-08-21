-- CreateTable
CREATE TABLE "business_state_meta" (
    "tenantId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "rebuiltAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_state_meta_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "receivables_risk_state" (
    "tenantId" TEXT NOT NULL,
    "openInvoiceCount" INTEGER NOT NULL,
    "overdueInvoiceCount" INTEGER NOT NULL,
    "totalOutstanding" DECIMAL(18,2) NOT NULL,
    "overdueOutstanding" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "computedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receivables_risk_state_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "inventory_risk_state" (
    "tenantId" TEXT NOT NULL,
    "lowStockCount" INTEGER NOT NULL,
    "thresholdMajor" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_risk_state_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "sales_momentum_state" (
    "tenantId" TEXT NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "windowFrom" TEXT NOT NULL,
    "windowTo" TEXT NOT NULL,
    "postedInvoiceCount" INTEGER NOT NULL,
    "salesTotal" DECIMAL(18,2) NOT NULL,
    "taxableTotal" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "computedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_momentum_state_pkey" PRIMARY KEY ("tenantId")
);

-- AddForeignKey
ALTER TABLE "business_state_meta" ADD CONSTRAINT "business_state_meta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables_risk_state" ADD CONSTRAINT "receivables_risk_state_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_risk_state" ADD CONSTRAINT "inventory_risk_state_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_momentum_state" ADD CONSTRAINT "sales_momentum_state_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
