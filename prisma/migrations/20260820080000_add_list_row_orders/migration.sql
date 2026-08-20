-- CreateTable
CREATE TABLE "list_row_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listKey" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "list_row_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "list_row_orders_tenantId_listKey_recordId_key" ON "list_row_orders"("tenantId", "listKey", "recordId");

-- CreateIndex
CREATE INDEX "list_row_orders_tenantId_listKey_sortOrder_idx" ON "list_row_orders"("tenantId", "listKey", "sortOrder");

-- AddForeignKey
ALTER TABLE "list_row_orders" ADD CONSTRAINT "list_row_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
