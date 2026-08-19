-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "defaultGstRateBps" INTEGER NOT NULL DEFAULT 1800;

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TEXT NOT NULL,
    "effectiveTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hsn_sac_codes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "taxRateBps" INTEGER NOT NULL,
    "effectiveFrom" TEXT NOT NULL,
    "effectiveTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hsn_sac_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_rates_tenantId_isDefault_idx" ON "tax_rates"("tenantId", "isDefault");

-- CreateIndex
CREATE INDEX "tax_rates_tenantId_effectiveFrom_idx" ON "tax_rates"("tenantId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "hsn_sac_codes_tenantId_code_idx" ON "hsn_sac_codes"("tenantId", "code");

-- CreateIndex
CREATE INDEX "hsn_sac_codes_tenantId_effectiveFrom_idx" ON "hsn_sac_codes"("tenantId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hsn_sac_codes" ADD CONSTRAINT "hsn_sac_codes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
