-- CreateTable
CREATE TABLE "attention_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "naturalKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "amount" DECIMAL(18,2),
    "currency" TEXT,
    "factId" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "dismissedAt" TIMESTAMP(3),
    "dismissedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attention_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_outcomes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "attentionItemId" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "idempotencyKey" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attention_items_tenantId_naturalKey_key" ON "attention_items"("tenantId", "naturalKey");

-- CreateIndex
CREATE INDEX "attention_items_tenantId_status_severity_idx" ON "attention_items"("tenantId", "status", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "automation_outcomes_tenantId_idempotencyKey_key" ON "automation_outcomes"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "automation_outcomes_tenantId_kind_recordedAt_idx" ON "automation_outcomes"("tenantId", "kind", "recordedAt");

-- CreateIndex
CREATE INDEX "automation_outcomes_tenantId_resourceType_resourceId_idx" ON "automation_outcomes"("tenantId", "resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "attention_items" ADD CONSTRAINT "attention_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_outcomes" ADD CONSTRAINT "automation_outcomes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_outcomes" ADD CONSTRAINT "automation_outcomes_attentionItemId_fkey" FOREIGN KEY ("attentionItemId") REFERENCES "attention_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
