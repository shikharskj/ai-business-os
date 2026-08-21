export {
  DOMAIN_EVENT_TYPES,
  DOMAIN_EVENT_TYPE_SET,
  AGGREGATE_TYPES,
  isDomainEventType,
  parseDomainEventPayload,
  DOMAIN_EVENT_PAYLOAD_SCHEMAS,
  type DomainEventType,
  type AggregateType,
  type DomainOutboxEventInput,
} from "@/modules/events/catalog";

export type {
  OutboxEventRecord,
  OutboxEventConsumer,
  OutboxConsumerHandleResult,
  OutboxDispatchRepository,
} from "@/modules/events/domain/types";

export {
  registerOutboxConsumer,
  unregisterOutboxConsumer,
  clearOutboxConsumers,
  listOutboxConsumers,
  getOutboxConsumer,
} from "@/modules/events/application/registry";

export {
  processOutboxConsumers,
  ensureOutboxConsumer,
  type ProcessOutboxConsumersInput,
  type ProcessOutboxConsumersResult,
  type ConsumerProcessStats,
} from "@/modules/events/application/process-outbox";

export {
  registerDefaultOutboxConsumers,
  type DefaultOutboxConsumerDeps,
} from "@/modules/events/application/register-default-consumers";

export {
  runOutboxProcessing,
  type RunOutboxProcessingInput,
  type RunOutboxProcessingResult,
} from "@/modules/events/application/run-outbox-processing";

export {
  createNotificationsOutboxConsumer,
  NOTIFICATIONS_CONSUMER_NAME,
} from "@/modules/events/consumers/notifications-consumer";

export {
  createProjectionStubConsumer,
  PROJECTION_STUB_CONSUMER_NAME,
} from "@/modules/events/consumers/projection-stub";

export { createPrismaOutboxDispatchRepository } from "@/modules/events/infrastructure/prisma-outbox-dispatch";
export { createMemoryOutboxDispatchRepository } from "@/modules/events/infrastructure/memory-outbox-dispatch";
export { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
