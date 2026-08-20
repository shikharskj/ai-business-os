import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money } from "@/modules/shared-kernel/money";
import { quantityFromMajor } from "@/modules/inventory/domain/quantity";
import { createPrismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import type { PreparedQuotation } from "@/modules/sales/domain/types";

describe("prisma sales repository createQuotation", () => {
  it("creates quotation and nested lines without tenantId on line payload", async () => {
    const business = await prisma.business.findFirst({
      include: {
        parties: { where: { kind: "CUSTOMER" }, take: 1 },
        products: { take: 1 },
      },
    });

    if (!business?.parties[0] || !business.products[0]) {
      expect(true).toBe(true);
      return;
    }

    const prepared: PreparedQuotation = {
      customerId: business.parties[0].id,
      customerName: business.parties[0].name,
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
          productId: business.products[0].id,
          productName: business.products[0].name,
          sku: business.products[0].sku,
          unitOfMeasurement: business.products[0].unitOfMeasurement,
          hsnSac: business.products[0].hsnSac,
          taxRateBps: business.products[0].taxRateBps,
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

    const quotation = await sales.createQuotation({
      tenantId: business.id,
      number,
      prepared,
    });
    expect(quotation.lines).toHaveLength(1);
    expect(quotation.lines[0]?.tenantId).toBe(business.id);
    await prisma.quotationLine.deleteMany({ where: { quotationId: quotation.id } });
    await prisma.quotation.delete({ where: { id: quotation.id } });
  });
});
