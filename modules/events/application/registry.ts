import type { OutboxEventConsumer } from "@/modules/events/domain/types";

const consumers = new Map<string, OutboxEventConsumer>();

/**
 * Registers an outbox consumer by unique name.
 * Re-registering the same name replaces the previous handler (useful in tests).
 */
export function registerOutboxConsumer(consumer: OutboxEventConsumer): void {
  if (!consumer.name.trim()) {
    throw new Error("Outbox consumer name is required");
  }
  consumers.set(consumer.name, consumer);
}

export function unregisterOutboxConsumer(name: string): void {
  consumers.delete(name);
}

export function clearOutboxConsumers(): void {
  consumers.clear();
}

export function listOutboxConsumers(): OutboxEventConsumer[] {
  return [...consumers.values()];
}

export function getOutboxConsumer(name: string): OutboxEventConsumer | undefined {
  return consumers.get(name);
}
