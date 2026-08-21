-- CreateTable
CREATE TABLE "outbox_consumer_receipts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumerName" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_consumer_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_consumer_receipts_consumerName_processedAt_idx" ON "outbox_consumer_receipts"("consumerName", "processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_consumer_receipts_eventId_consumerName_key" ON "outbox_consumer_receipts"("eventId", "consumerName");

-- CreateIndex
CREATE INDEX "outbox_events_createdAt_idx" ON "outbox_events"("createdAt");

-- AddForeignKey
ALTER TABLE "outbox_consumer_receipts" ADD CONSTRAINT "outbox_consumer_receipts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "outbox_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: events already consumed by the notifications processor get a notifications receipt
INSERT INTO "outbox_consumer_receipts" ("id", "eventId", "consumerName", "processedAt")
SELECT 'receipt-notifications-' || "id", "id", 'notifications', COALESCE("processedAt", CURRENT_TIMESTAMP)
FROM "outbox_events"
WHERE "processedAt" IS NOT NULL
ON CONFLICT DO NOTHING;
