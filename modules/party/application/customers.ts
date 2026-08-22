import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  PartyAlreadyActiveError,
  PartyInactiveError,
  PartyNotFoundError,
} from "@/modules/party/domain/errors";
import { normalizeCustomerInput } from "@/modules/party/domain/normalize-customer";
import type { Customer, CustomerInput, PartyStatus } from "@/modules/party/domain/types";
import { createPrismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import type { PartyRepository } from "@/modules/party/infrastructure/repositories";

export async function createCustomer(input: {
  tenantId: string;
  actorUserId: string;
  fields: CustomerInput;
  parties?: PartyRepository;
  audit?: AuditRepository;
  outbox?: OutboxRepository;
  prisma?: PrismaClient;
}): Promise<Customer> {
  const fields = normalizeCustomerInput(input.fields);

  // If prisma client is provided, use transaction
  if (input.prisma) {
    return input.prisma.$transaction(async (tx) => {
      const parties = createPrismaPartyRepository(tx);
      const audit = createPrismaAuditRepository(tx);
      const outbox = createPrismaOutboxRepository(tx);

      const customer = await parties.createCustomer({
        tenantId: input.tenantId,
        fields,
      });

      await audit.append({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        action: "customer.created",
        resource: "customer",
        resourceId: customer.id,
        metadata: { name: customer.name },
      });

      await outbox.persist({
        tenantId: input.tenantId,
        eventType: "CustomerCreated",
        aggregateType: "customer",
        aggregateId: customer.id,
        payload: { name: customer.name, status: customer.status },
      });

      return customer;
    });
  }

  // Fallback for tests that pass repositories directly
  if (!input.parties || !input.audit || !input.outbox) {
    throw new Error("Either prisma or all repositories (parties, audit, outbox) must be provided");
  }

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
  parties?: PartyRepository;
  audit?: AuditRepository;
  outbox?: OutboxRepository;
  prisma?: PrismaClient;
}): Promise<Customer> {
  const fields = normalizeCustomerInput(input.fields);

  // If prisma client is provided, use transaction
  if (input.prisma) {
    return input.prisma.$transaction(async (tx) => {
      const parties = createPrismaPartyRepository(tx);
      const audit = createPrismaAuditRepository(tx);
      const outbox = createPrismaOutboxRepository(tx);

      const existing = await parties.findCustomerById(
        input.tenantId,
        input.customerId
      );
      if (!existing) {
        throw new PartyNotFoundError();
      }
      if (existing.status === "INACTIVE") {
        throw new PartyInactiveError();
      }

      const customer = await parties.updateCustomer({
        tenantId: input.tenantId,
        customerId: input.customerId,
        fields,
      });
      if (!customer) {
        throw new PartyNotFoundError();
      }

      await audit.append({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        action: "customer.updated",
        resource: "customer",
        resourceId: customer.id,
        metadata: { name: customer.name },
      });

      await outbox.persist({
        tenantId: input.tenantId,
        eventType: "CustomerUpdated",
        aggregateType: "customer",
        aggregateId: customer.id,
        payload: { name: customer.name, status: customer.status },
      });

      return customer;
    });
  }

  // Fallback for tests that pass repositories directly
  if (!input.parties || !input.audit || !input.outbox) {
    throw new Error("Either prisma or all repositories (parties, audit, outbox) must be provided");
  }

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

export async function listCustomersPage(input: {
  tenantId: string;
  query?: string;
  status?: PartyStatus | "ALL";
  page: number;
  pageSize: import("@/modules/shared-kernel/list-page").PageSize;
  parties: PartyRepository;
}) {
  return input.parties.listCustomersPage({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    page: input.page,
    pageSize: input.pageSize,
  });
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
  parties?: PartyRepository;
  audit?: AuditRepository;
  outbox?: OutboxRepository;
  prisma?: PrismaClient;
}): Promise<Customer> {
  // If prisma client is provided, use transaction
  if (input.prisma) {
    return input.prisma.$transaction(async (tx) => {
      const parties = createPrismaPartyRepository(tx);
      const audit = createPrismaAuditRepository(tx);
      const outbox = createPrismaOutboxRepository(tx);

      const existing = await parties.findCustomerById(
        input.tenantId,
        input.customerId
      );
      if (!existing) {
        throw new PartyNotFoundError();
      }
      if (existing.status === "INACTIVE") {
        throw new PartyInactiveError();
      }

      const customer = await parties.deactivateCustomer(
        input.tenantId,
        input.customerId
      );
      if (!customer) {
        throw new PartyNotFoundError();
      }

      await audit.append({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        action: "customer.deactivated",
        resource: "customer",
        resourceId: customer.id,
        metadata: { name: customer.name },
      });

      await outbox.persist({
        tenantId: input.tenantId,
        eventType: "CustomerDeactivated",
        aggregateType: "customer",
        aggregateId: customer.id,
        payload: { name: customer.name, status: customer.status },
      });

      return customer;
    });
  }

  // Fallback for tests that pass repositories directly
  if (!input.parties || !input.audit || !input.outbox) {
    throw new Error("Either prisma or all repositories (parties, audit, outbox) must be provided");
  }

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

export async function reactivateCustomer(input: {
  tenantId: string;
  actorUserId: string;
  customerId: string;
  parties?: PartyRepository;
  audit?: AuditRepository;
  outbox?: OutboxRepository;
  prisma?: PrismaClient;
}): Promise<Customer> {
  if (input.prisma) {
    return input.prisma.$transaction(async (tx) => {
      const parties = createPrismaPartyRepository(tx);
      const audit = createPrismaAuditRepository(tx);
      const outbox = createPrismaOutboxRepository(tx);

      const existing = await parties.findCustomerById(
        input.tenantId,
        input.customerId
      );
      if (!existing) {
        throw new PartyNotFoundError();
      }
      if (existing.status === "ACTIVE") {
        throw new PartyAlreadyActiveError();
      }

      const customer = await parties.reactivateCustomer(
        input.tenantId,
        input.customerId
      );
      if (!customer) {
        throw new PartyNotFoundError();
      }

      await audit.append({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        action: "customer.reactivated",
        resource: "customer",
        resourceId: customer.id,
        metadata: { name: customer.name },
      });

      await outbox.persist({
        tenantId: input.tenantId,
        eventType: "CustomerReactivated",
        aggregateType: "customer",
        aggregateId: customer.id,
        payload: { name: customer.name, status: customer.status },
      });

      return customer;
    });
  }

  if (!input.parties || !input.audit || !input.outbox) {
    throw new Error("Either prisma or all repositories (parties, audit, outbox) must be provided");
  }

  const existing = await input.parties.findCustomerById(
    input.tenantId,
    input.customerId
  );
  if (!existing) {
    throw new PartyNotFoundError();
  }
  if (existing.status === "ACTIVE") {
    throw new PartyAlreadyActiveError();
  }

  const customer = await input.parties.reactivateCustomer(
    input.tenantId,
    input.customerId
  );
  if (!customer) {
    throw new PartyNotFoundError();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "customer.reactivated",
    resource: "customer",
    resourceId: customer.id,
    metadata: { name: customer.name },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "CustomerReactivated",
    aggregateType: "customer",
    aggregateId: customer.id,
    payload: { name: customer.name, status: customer.status },
  });

  return customer;
}
