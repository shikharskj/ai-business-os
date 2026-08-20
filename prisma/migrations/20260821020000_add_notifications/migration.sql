-- In-app notifications (spec 26). Created from outbox events after commit.

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_tenantId_idempotencyKey_key" ON "notifications"("tenantId", "idempotencyKey");

CREATE INDEX "notifications_tenantId_createdAt_idx" ON "notifications"("tenantId", "createdAt");

CREATE INDEX "notifications_tenantId_readAt_idx" ON "notifications"("tenantId", "readAt");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
