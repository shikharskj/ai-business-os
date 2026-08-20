import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money } from "@/modules/shared-kernel/money";
import { quantityFromMajor } from "@/modules/inventory/domain/quantity";
import { createPrismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import type { PreparedQuotation } from "@/modules/sales/domain/types";

describe("prisma sales repository createQuotation", () => {
  it("creates quotation and nested lines without tenantId on line payload", async () => {
    const business = await prisma.business.findFirst();
    if (!business) {
      throw new Error("No business found for test");
    }

    const customer = await prisma.party.create({
      data: {
        tenantId: business.id,
        kind: "CUSTOMER",
        name: "Test Customer",
        state: "Maharashtra",
      },
    });

    const product = await prisma.product.create({
      data: {
        tenantId: business.id,
        kind: "PRODUCT",
        name: "Test Product",
        sku: `TEST-${Date.now()}`,
        unitOfMeasurement: "PCS",
        hsnSac: "1234",
        taxRateBps: 1800,
        sellingPrice: 1000,
        purchasePrice: 800,
      },
    });

    const prepared: PreparedQuotation = {
      customerId: customer.id,
      customerName: customer.name,
      issuedOn: businessDate("2026-04-02"),
      validUntil: null,
      notes: null,
      placeOfSupplyStateCode: "27",
      subtotal: money(1000_00n),
      discountTotal: money(0n),
      taxableAmount: money(1000_00n),
      cgst: money(90_00n),
      sgst: money(90_00n),
      igst: money(0n),
      totalTax: money(180_00n),
      grandTotal: money(1180_00n),
      supplyType: "INTRA_STATE",
      lines: [
        {
          sortOrder: 0,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unitOfMeasurement: product.unitOfMeasurement,
          hsnSac: product.hsnSac,
          taxRateBps: product.taxRateBps,
          quantity: quantityFromMajor("1"),
          unitPrice: money(1000_00n),
          discount: money(0n),
          lineSubtotal: money(1000_00n),
          taxableAmount: money(1000_00n),
          cgst: money(90_00n),
          sgst: money(90_00n),
          igst: money(0n),
          totalTax: money(180_00n),
          lineTotal: money(1180_00n),
          supplyType: "INTRA_STATE",
          treatment: "STANDARD",
        },
      ],
    };

    const sales = createPrismaSalesRepository(prisma);
    const number = `QT/DEBUG/${Date.now()}`;

    let quotation;
    try {
      quotation = await sales.createQuotation({
        tenantId: business.id,
        number,
        prepared,
      });
      expect(quotation.lines).toHaveLength(1);
      expect(quotation.lines[0]?.tenantId).toBe(business.id);
    } finally {
      if (quotation) {
        await prisma.quotationLine.deleteMany({ where: { quotationId: quotation.id } });
        await prisma.quotation.delete({ where: { id: quotation.id } });
      }
      await prisma.product.delete({ where: { id: product.id } });
      await prisma.party.delete({ where: { id: customer.id } });
    }
  });
});
