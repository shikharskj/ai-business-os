-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "triggerEventId" TEXT NOT NULL,
    "triggerEventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "triggerPayload" JSONB NOT NULL DEFAULT '{}',
    "idempotencyKey" TEXT NOT NULL,
    "concurrencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL DEFAULT 'EVENT',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "result" JSONB NOT NULL DEFAULT '{}',
    "outcomeKind" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_runs_tenantId_idempotencyKey_key" ON "workflow_runs"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "workflow_runs_status_nextAttemptAt_idx" ON "workflow_runs"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "workflow_runs_tenantId_createdAt_idx" ON "workflow_runs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "workflow_runs_tenantId_concurrencyKey_status_idx" ON "workflow_runs"("tenantId", "concurrencyKey", "status");

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
