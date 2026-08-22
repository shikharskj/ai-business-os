import { lowStockNaturalKey } from "@/modules/business-state/domain/attention-keys";
import { recordReorderPrepared } from "@/modules/business-state/application/record-expansion-outcomes";
import type { OutboxEventRecord } from "@/modules/events/domain/types";
import {
  parseLowStockThreshold,
  quantityFromMajor,
  toQuantityMajorString,
  ZERO_QUANTITY,
} from "@/modules/inventory";
import {
  businessDate,
  todayInTimezone,
  type BusinessDate,
} from "@/modules/shared-kernel/dates";
import { collectionsCooldownMs } from "@/modules/workflows/domain/collections-keys";
import {
  expansionAsOf,
  payloadString,
  reorderPrepareConcurrencyKey,
  reorderPrepareIdempotencyKey,
} from "@/modules/workflows/domain/expansion-keys";
import {
  REORDER_COVER_DAYS,
  reorderWindowFrom,
  saleOutflowInWindow,
  suggestReorderQuantity,
} from "@/modules/workflows/domain/reorder-quantity";
import {
  EXPANSION_COOLDOWN_DAYS,
  REORDER_PREPARE_WORKFLOW_ID,
  type WorkflowActionContext,
  type WorkflowDefinition,
} from "@/modules/workflows/domain/types";

function asOfFor(
  event: OutboxEventRecord,
  context: WorkflowActionContext
): BusinessDate {
  const raw = expansionAsOf(event);
  return raw ? businessDate(raw) : todayInTimezone(context.timezone);
}

async function prepareReorderDraft(
  event: OutboxEventRecord,
  context: WorkflowActionContext
): Promise<Record<string, unknown>> {
  const productName = payloadString(event.payload, "productName");
  const sku = payloadString(event.payload, "sku");
  const unit = payloadString(event.payload, "unitOfMeasurement") ?? "PCS";
  const asOf = asOfFor(event, context);
  const threshold = parseLowStockThreshold(
    context.toolContext?.lowStockThresholdMajor ??
      payloadString(event.payload, "thresholdMajor")
  );
  const currentMajor = payloadString(event.payload, "quantityMajor");
  let current = ZERO_QUANTITY;
  if (currentMajor) {
    try {
      current = quantityFromMajor(currentMajor);
    } catch {
      current = ZERO_QUANTITY;
    }
  }

  let saleOutflow = ZERO_QUANTITY;
  const inventory = context.toolContext?.repositories.inventory;
  if (inventory) {
    const movements = await inventory.listMovements(
      context.tenantId,
      event.aggregateId
    );
    saleOutflow = saleOutflowInWindow({
      movements,
      tenantId: context.tenantId,
      productId: event.aggregateId,
      windowFrom: reorderWindowFrom(asOf),
      windowTo: asOf,
    });
  }

  const suggested = suggestReorderQuantity({
    current,
    threshold,
    saleOutflow,
  });
  const suggestedMajor = toQuantityMajorString(suggested);

  return {
    productId: event.aggregateId,
    productName,
    sku,
    unitOfMeasurement: unit,
    currentQuantityMajor: currentMajor,
    suggestedQuantityMajor: suggestedMajor,
    coverDays: REORDER_COVER_DAYS,
    href: `/app/purchases/bills/new?productId=${encodeURIComponent(event.aggregateId)}&quantity=${encodeURIComponent(suggestedMajor)}`,
    posted: false,
  };
}

/**
 * Low-stock reorder: L1 recommend / L2 prepare draft purchase inputs.
 * Never auto-posts a purchase.
 */
export function createReorderPrepareWorkflow(): WorkflowDefinition {
  return {
    id: REORDER_PREPARE_WORKFLOW_ID,
    label: "Reorder prepare",
    eventTypes: ["StockLow"],
    autonomyLevel: "L2",
    mode: "dry_run",
    idempotencyKey(event, context) {
      const asOf = asOfFor(event, context);
      return reorderPrepareIdempotencyKey(
        event.aggregateId,
        typeof asOf === "string" ? asOf : asOf
      );
    },
    concurrencyKey(event) {
      return reorderPrepareConcurrencyKey(event.aggregateId);
    },
    async condition(event, context) {
      const item = await context.attention.findByNaturalKey(
        context.tenantId,
        lowStockNaturalKey(event.aggregateId)
      );
      if (!item || item.tenantId !== context.tenantId) {
        return { match: false, reason: "not_in_attention_queue" };
      }
      if (item.type !== "LOW_STOCK" || item.status !== "OPEN") {
        return { match: false, reason: "not_open_low_stock" };
      }

      const recent = await context.attention.listOutcomes({
        tenantId: context.tenantId,
        kind: "REORDER_PREPARED",
        resourceType: "Product",
        resourceIds: [event.aggregateId],
        recordedAfter: new Date(
          Date.now() - collectionsCooldownMs(EXPANSION_COOLDOWN_DAYS)
        ),
      });
      if (recent.length > 0) {
        return { match: false, reason: "cooldown" };
      }

      return { match: true };
    },
    async reason(event) {
      const name = payloadString(event.payload, "productName");
      return {
        summary: `${name ?? "A product"} is low on stock. Prepare a purchase — do not post it automatically.`,
      };
    },
    async action(event, context) {
      const asOf = asOfFor(event, context);
      const draft = await prepareReorderDraft(event, context);

      await recordReorderPrepared({
        tenantId: context.tenantId,
        productId: event.aggregateId,
        asOf,
        payload: draft,
        attention: context.attention,
        outbox: context.toolContext?.repositories.outbox,
      });

      return {
        executed: false,
        dryRun: true,
        message:
          "Prepared draft purchase inputs for reorder. No purchase was posted.",
        payload: draft,
      };
    },
  };
}
