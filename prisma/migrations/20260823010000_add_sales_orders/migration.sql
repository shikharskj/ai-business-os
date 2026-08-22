-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED', 'FULFILLED');

-- AlterTable
ALTER TABLE "sales_invoices" ADD COLUMN "salesOrderId" TEXT;

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "quotationId" TEXT,
    "issuedOn" TEXT NOT NULL,
    "expectedOn" TEXT,
    "notes" TEXT,
    "placeOfSupplyStateCode" TEXT NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "discountTotal" DECIMAL(18,2) NOT NULL,
    "taxableAmount" DECIMAL(18,2) NOT NULL,
    "cgst" DECIMAL(18,2) NOT NULL,
    "sgst" DECIMAL(18,2) NOT NULL,
    "igst" DECIMAL(18,2) NOT NULL,
    "totalTax" DECIMAL(18,2) NOT NULL,
    "grandTotal" DECIMAL(18,2) NOT NULL,
    "supplyType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unitOfMeasurement" TEXT NOT NULL,
    "hsnSac" TEXT,
    "taxRateBps" INTEGER NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL,
    "lineSubtotal" DECIMAL(18,2) NOT NULL,
    "taxableAmount" DECIMAL(18,2) NOT NULL,
    "cgst" DECIMAL(18,2) NOT NULL,
    "sgst" DECIMAL(18,2) NOT NULL,
    "igst" DECIMAL(18,2) NOT NULL,
    "totalTax" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "supplyType" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,

    CONSTRAINT "sales_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_number_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financialYearKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,

    CONSTRAINT "sales_order_number_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_id_tenantId_key" ON "sales_orders"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_tenantId_number_key" ON "sales_orders"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_quotationId_tenantId_key" ON "sales_orders"("quotationId", "tenantId");

-- CreateIndex
CREATE INDEX "sales_orders_tenantId_status_idx" ON "sales_orders"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sales_orders_tenantId_customerId_idx" ON "sales_orders"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "sales_orders_tenantId_issuedOn_idx" ON "sales_orders"("tenantId", "issuedOn");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_lines_id_tenantId_key" ON "sales_order_lines"("id", "tenantId");

-- CreateIndex
CREATE INDEX "sales_order_lines_tenantId_salesOrderId_idx" ON "sales_order_lines"("tenantId", "salesOrderId");

-- CreateIndex
CREATE INDEX "sales_order_lines_salesOrderId_sortOrder_idx" ON "sales_order_lines"("salesOrderId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_number_series_tenantId_financialYearKey_key" ON "sales_order_number_series"("tenantId", "financialYearKey");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_salesOrderId_tenantId_key" ON "sales_invoices"("salesOrderId", "tenantId");

-- CreateIndex
CREATE INDEX "sales_orders_search_fts_idx" ON "sales_orders"
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(number, '') || ' ' || coalesce("customerName", '')
    )
  );

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customerId_tenantId_fkey" FOREIGN KEY ("customerId", "tenantId") REFERENCES "parties"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_quotationId_tenantId_fkey" FOREIGN KEY ("quotationId", "tenantId") REFERENCES "quotations"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_salesOrderId_tenantId_fkey" FOREIGN KEY ("salesOrderId", "tenantId") REFERENCES "sales_orders"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "products"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_number_series" ADD CONSTRAINT "sales_order_number_series_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_salesOrderId_tenantId_fkey" FOREIGN KEY ("salesOrderId", "tenantId") REFERENCES "sales_orders"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
