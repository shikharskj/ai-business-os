-- CreateTable
CREATE TABLE "cash_position_state" (
    "tenantId" TEXT NOT NULL,
    "cashBalance" DECIMAL(18,2) NOT NULL,
    "bankBalance" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "scale" INTEGER NOT NULL DEFAULT 2,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_position_state_pkey" PRIMARY KEY ("tenantId")
);

-- AddForeignKey
ALTER TABLE "cash_position_state" ADD CONSTRAINT "cash_position_state_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
