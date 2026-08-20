import type {
  OutboxEventRecord,
  OverdueInvoiceCandidate,
} from "@/modules/notifications/domain/types";

export type OutboxConsumerRepository = {
  listUnprocessed(input: {
    tenantId?: string;
    limit: number;
  }): Promise<OutboxEventRecord[]>;
  markProcessed(eventId: string): Promise<void>;
};

export type NotificationContextRepository = {
  getBusinessTimezone(tenantId: string): Promise<string | null>;
  getLowStockThresholdMajor(tenantId: string): Promise<string | null>;
  getProductLabel(input: {
    tenantId: string;
    productId: string;
  }): Promise<{ name: string; sku: string } | null>;
  getProductStockQuantityMajor(input: {
    tenantId: string;
    productId: string;
  }): Promise<string | null>;
  listOverdueInvoices(input: {
    tenantId: string;
    asOfDate: string;
  }): Promise<OverdueInvoiceCandidate[]>;
};
