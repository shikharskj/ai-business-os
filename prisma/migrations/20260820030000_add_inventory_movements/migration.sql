-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "lowStockThreshold" DECIMAL(18,4) NOT NULL DEFAULT 5.0000;

-- CreateEnum
CREATE TYPE "InventoryMovementCause" AS ENUM ('OPENING', 'ADJUSTMENT', 'SALE', 'PURCHASE', 'RETURN');

-- CreateEnum
CREATE TYPE "InventoryMovementDirection" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cause" "InventoryMovementCause" NOT NULL,
    "direction" "InventoryMovementDirection" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "occurredOn" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_id_tenantId_key" ON "inventory_movements"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_tenantId_idempotencyKey_key" ON "inventory_movements"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "inventory_movements_tenantId_productId_occurredOn_idx" ON "inventory_movements"("tenantId", "productId", "occurredOn");

-- CreateIndex
CREATE INDEX "inventory_movements_tenantId_cause_idx" ON "inventory_movements"("tenantId", "cause");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "products"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
