import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  PartyInactiveError,
  PartyNotFoundError,
} from "@/modules/party/domain/errors";
import { normalizeCustomerInput } from "@/modules/party/domain/normalize-customer";
import type { Customer, CustomerInput, PartyStatus } from "@/modules/party/domain/types";
import type { PartyRepository } from "@/modules/party/infrastructure/repositories";

export async function createCustomer(input: {
  tenantId: string;
  actorUserId: string;
  fields: CustomerInput;
  parties: PartyRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}): Promise<Customer> {
  const fields = normalizeCustomerInput(input.fields);
  const customer = await input.parties.createCustomer({
    tenantId: input.tenantId,
    fields,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "customer.created",
    resource: "customer",
    resourceId: customer.id,
    metadata: { name: customer.name },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "CustomerCreated",
    aggregateType: "customer",
    aggregateId: customer.id,
    payload: { name: customer.name, status: customer.status },
  });

  return customer;
}

export async function updateCustomer(input: {
  tenantId: string;
  actorUserId: string;
  customerId: string;
  fields: CustomerInput;
  parties: PartyRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}): Promise<Customer> {
  const fields = normalizeCustomerInput(input.fields);
  const customer = await input.parties.updateCustomer({
    tenantId: input.tenantId,
    customerId: input.customerId,
    fields,
  });
  if (!customer) {
    throw new PartyNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "customer.updated",
    resource: "customer",
    resourceId: customer.id,
    metadata: { name: customer.name },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "CustomerUpdated",
    aggregateType: "customer",
    aggregateId: customer.id,
    payload: { name: customer.name, status: customer.status },
  });

  return customer;
}

export async function getCustomer(input: {
  tenantId: string;
  customerId: string;
  parties: PartyRepository;
}): Promise<Customer> {
  const customer = await input.parties.findCustomerById(
    input.tenantId,
    input.customerId
  );
  if (!customer) {
    throw new PartyNotFoundError();
  }
  return customer;
}

export async function listCustomers(input: {
  tenantId: string;
  query?: string;
  status?: PartyStatus | "ALL";
  parties: PartyRepository;
}): Promise<Customer[]> {
  return input.parties.listCustomers({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
  });
}

export async function deactivateCustomer(input: {
  tenantId: string;
  actorUserId: string;
  customerId: string;
  parties: PartyRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}): Promise<Customer> {
  const existing = await input.parties.findCustomerById(
    input.tenantId,
    input.customerId
  );
  if (!existing) {
    throw new PartyNotFoundError();
  }
  if (existing.status === "INACTIVE") {
    throw new PartyInactiveError();
  }

  const customer = await input.parties.deactivateCustomer(
    input.tenantId,
    input.customerId
  );
  if (!customer) {
    throw new PartyNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "customer.deactivated",
    resource: "customer",
    resourceId: customer.id,
    metadata: { name: customer.name },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "CustomerDeactivated",
    aggregateType: "customer",
    aggregateId: customer.id,
    payload: { name: customer.name, status: customer.status },
  });

  return customer;
}
