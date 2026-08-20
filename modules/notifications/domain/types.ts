export const NOTIFICATION_CHANNELS = ["IN_APP"] as const;
export type NotificationChannelName = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TYPES = [
  "INVOICE_CREATED",
  "INVOICE_POSTED",
  "PAYMENT_RECEIVED",
  "INVOICE_OVERDUE",
  "LOW_STOCK",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationRecord = {
  id: string;
  tenantId: string;
  channel: NotificationChannelName;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  resourceType: string | null;
  resourceId: string | null;
  idempotencyKey: string;
  readAt: Date | null;
  createdAt: Date;
};

export type CreateNotificationInput = {
  tenantId: string;
  channel: NotificationChannelName;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  idempotencyKey: string;
};

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationListResponse = {
  unreadCount: number;
  notifications: NotificationListItem[];
};

export type OutboxEventRecord = {
  id: string;
  tenantId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type OverdueInvoiceCandidate = {
  id: string;
  number: string;
  customerName: string;
  dueOn: string;
};
