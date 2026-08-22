-- CreateTable
CREATE TABLE "tenant_autonomy_policies" (
    "tenantId" TEXT NOT NULL,
    "allowedActionClasses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "amountThresholds" JSONB NOT NULL DEFAULT '{}',
    "requireConfirmationAbove" JSONB NOT NULL DEFAULT '{}',
    "disabledAutomations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_autonomy_policies_pkey" PRIMARY KEY ("tenantId")
);

-- AddForeignKey
ALTER TABLE "tenant_autonomy_policies" ADD CONSTRAINT "tenant_autonomy_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
