import type { PrismaClient } from "@/generated/prisma/client";

import {
  quantityFromPrismaDecimal,
  toQuantityMajorString,
} from "@/modules/inventory/domain/quantity";
import { quantityFromMovements } from "@/modules/inventory/domain/stock";
import type { InventoryMovement } from "@/modules/inventory/domain/types";
import {
  INVENTORY_MOVEMENT_CAUSES,
  INVENTORY_MOVEMENT_DIRECTIONS,
} from "@/modules/inventory/domain/types";
import type { NotificationContextRepository } from "@/modules/notifications/domain/outbox-consumer-repository";
import { remainingOutstanding } from "@/modules/payments/domain/allocation";
import { RECEIVABLE_INVOICE_STATUSES } from "@/modules/sales/domain/invoice-status";
import { businessDate } from "@/modules/shared-kernel/dates";
import {
  addMoney,
  money,
  moneyFromMajor,
} from "@/modules/shared-kernel/money";

type PrismaContextClient = Pick<
  PrismaClient,
  | "business"
  | "product"
  | "inventoryMovement"
  | "salesInvoice"
  | "customerPaymentAllocation"
>;

export function createPrismaNotificationContextRepository(
  prisma: PrismaContextClient
): NotificationContextRepository & {
  listAllTenantIds(): Promise<string[]>;
} {
  return {
    async getBusinessTimezone(tenantId) {
      const business = await prisma.business.findUnique({
        where: { id: tenantId },
        select: { timezone: true },
      });
      return business?.timezone ?? null;
    },

    async getLowStockThresholdMajor(tenantId) {
      const business = await prisma.business.findUnique({
        where: { id: tenantId },
        select: { lowStockThreshold: true },
      });
      return business ? business.lowStockThreshold.toString() : null;
    },

    async getProductLabel({ tenantId, productId }) {
      const product = await prisma.product.findFirst({
        where: { id: productId, tenantId, tracksInventory: true },
        select: { name: true, sku: true },
      });
      return product ? { name: product.name, sku: product.sku } : null;
    },

    async getProductStockQuantityMajor({ tenantId, productId }) {
      const movements = await prisma.inventoryMovement.findMany({
        where: { tenantId, productId },
      });
      const domainMovements = movements.map(mapMovement);
      return toQuantityMajorString(quantityFromMovements(domainMovements));
    },

    async listOverdueInvoices({ tenantId, asOfDate }) {
      const invoices = await prisma.salesInvoice.findMany({
        where: {
          tenantId,
          status: { in: [...RECEIVABLE_INVOICE_STATUSES] },
          dueOn: { not: null, lt: asOfDate },
        },
        select: {
          id: true,
          number: true,
          customerName: true,
          dueOn: true,
          grandTotal: true,
        },
      });

      if (invoices.length === 0) {
        return [];
      }

      const allocations = await prisma.customerPaymentAllocation.findMany({
        where: {
          tenantId,
          invoiceId: { in: invoices.map((row) => row.id) },
        },
        select: { invoiceId: true, amount: true },
      });

      const sums = new Map<string, ReturnType<typeof money>>();
      for (const allocation of allocations) {
        const prev = sums.get(allocation.invoiceId) ?? money(0n);
        sums.set(
          allocation.invoiceId,
          addMoney(prev, moneyFromMajor(allocation.amount.toString(), "INR"))
        );
      }

      const overdue = [];
      for (const invoice of invoices) {
        if (!invoice.dueOn) continue;
        const outstanding = remainingOutstanding(
          moneyFromMajor(invoice.grandTotal.toString(), "INR"),
          sums.get(invoice.id) ?? money(0n)
        );
        if (outstanding.amountMinor <= 0n) continue;
        overdue.push({
          id: invoice.id,
          number: invoice.number,
          customerName: invoice.customerName,
          dueOn: invoice.dueOn,
        });
      }
      return overdue;
    },

    async listAllTenantIds() {
      const rows = await prisma.business.findMany({ select: { id: true } });
      return rows.map((row) => row.id);
    },
  };
}

function mapMovement(record: {
  id: string;
  tenantId: string;
  productId: string;
  cause: string;
  direction: string;
  quantity: { toString(): string };
  occurredOn: string;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  reason: string | null;
  actorUserId: string;
  createdAt: Date;
}): InventoryMovement {
  if (!(INVENTORY_MOVEMENT_CAUSES as readonly string[]).includes(record.cause)) {
    throw new Error("Unknown inventory movement cause.");
  }
  if (
    !(INVENTORY_MOVEMENT_DIRECTIONS as readonly string[]).includes(
      record.direction
    )
  ) {
    throw new Error("Unknown inventory movement direction.");
  }

  return {
    id: record.id,
    tenantId: record.tenantId,
    productId: record.productId,
    cause: record.cause as InventoryMovement["cause"],
    direction: record.direction as InventoryMovement["direction"],
    quantity: quantityFromPrismaDecimal(record.quantity),
    occurredOn: businessDate(record.occurredOn),
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    idempotencyKey: record.idempotencyKey,
    reason: record.reason,
    actorUserId: record.actorUserId,
    createdAt: record.createdAt,
  };
}
