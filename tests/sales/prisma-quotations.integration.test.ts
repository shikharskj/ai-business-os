import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money } from "@/modules/shared-kernel/money";
import { quantityFromMajor } from "@/modules/inventory/domain/quantity";
import { createPrismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import type { PreparedQuotation } from "@/modules/sales/domain/types";

describe("prisma sales repository createQuotation", () => {
  let tenantId = "";
  let userId = "";

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk_quotation_test_${crypto.randomUUID()}` },
    });
    userId = user.id;

    const business = await prisma.business.create({
      data: {
        clerkOrganizationId: `org_quotation_test_${crypto.randomUUID()}`,
        name: "Quotation Test Business",
        type: "PROPRIETORSHIP",
        ownerUserId: user.id,
        addressLine1: "1 Test Street",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        phone: "9999999999",
        email: "quotation-test@example.com",
        gstRegistrationStatus: "NOT_REGISTERED",
        financialYearStartMonth: 4,
      },
    });
    tenantId = business.id;
  });

  afterAll(async () => {
    if (tenantId) {
      try {
        await prisma.quotationLine.deleteMany({ where: { tenantId } });
      } catch (error) {
        console.warn("Failed to delete quotation lines:", error);
      }
      try {
        await prisma.quotation.deleteMany({ where: { tenantId } });
      } catch (error) {
        console.warn("Failed to delete quotations:", error);
      }
      try {
        await prisma.quotationNumberSeries.deleteMany({ where: { tenantId } });
      } catch (error) {
        console.warn("Failed to delete quotation number series:", error);
      }
      try {
        await prisma.product.deleteMany({ where: { tenantId } });
      } catch (error) {
        console.warn("Failed to delete products:", error);
      }
      try {
        await prisma.party.deleteMany({ where: { tenantId } });
      } catch (error) {
        console.warn("Failed to delete parties:", error);
      }
      try {
        await prisma.business.delete({ where: { id: tenantId } });
      } catch (error) {
        console.warn("Failed to delete business:", error);
      }
    }
    if (userId) {
      try {
        await prisma.user.delete({ where: { id: userId } });
      } catch (error) {
        console.warn("Failed to delete user:", error);
      }
    }
  });

  it("creates quotation and nested lines without tenantId on line payload", async () => {
    let customer;
    let product;
    let quotation;

    try {
      customer = await prisma.party.create({
        data: {
          tenantId,
          kind: "CUSTOMER",
          name: "Test Customer",
          state: "Maharashtra",
        },
      });

      product = await prisma.product.create({
        data: {
          tenantId,
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

      quotation = await sales.createQuotation({
        tenantId,
        number,
        prepared,
      });
      expect(quotation.lines).toHaveLength(1);
      expect(quotation.lines[0]?.tenantId).toBe(tenantId);
    } finally {
      if (quotation) {
        try {
          await prisma.quotationLine.deleteMany({ where: { quotationId: quotation.id } });
        } catch (error) {
          console.warn("Failed to delete quotation lines:", error);
        }
        try {
          await prisma.quotation.delete({ where: { id: quotation.id } });
        } catch (error) {
          console.warn("Failed to delete quotation:", error);
        }
      }
      if (product) {
        try {
          await prisma.product.delete({ where: { id: product.id } });
        } catch (error) {
          console.warn("Failed to delete product:", error);
        }
      }
      if (customer) {
        try {
          await prisma.party.delete({ where: { id: customer.id } });
        } catch (error) {
          console.warn("Failed to delete customer:", error);
        }
      }
    }
  });
});
