import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  PartyInactiveError,
  PartyNotFoundError,
} from "@/modules/party/domain/errors";
import { normalizeSupplierInput } from "@/modules/party/domain/normalize-customer";
import type { PartyStatus, Supplier, SupplierInput } from "@/modules/party/domain/types";
import { createPrismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import type { PartyRepository } from "@/modules/party/infrastructure/repositories";

const notFound = () => new PartyNotFoundError("Supplier was not found.");
const alreadyInactive = () =>
  new PartyInactiveError("This supplier is already inactive.");

export async function createSupplier(input: {
  tenantId: string;
  actorUserId: string;
  fields: SupplierInput;
  parties?: PartyRepository;
  audit?: AuditRepository;
  outbox?: OutboxRepository;
  prisma?: PrismaClient;
}): Promise<Supplier> {
  const fields = normalizeSupplierInput(input.fields);

  // If prisma client is provided, use transaction
  if (input.prisma) {
    return input.prisma.$transaction(async (tx) => {
      const parties = createPrismaPartyRepository(tx);
      const audit = createPrismaAuditRepository(tx);
      const outbox = createPrismaOutboxRepository(tx);

      const supplier = await parties.createSupplier({
        tenantId: input.tenantId,
        fields,
      });

      await audit.append({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        action: "supplier.created",
        resource: "supplier",
        resourceId: supplier.id,
        metadata: { name: supplier.name },
      });

      await outbox.persist({
        tenantId: input.tenantId,
        eventType: "SupplierCreated",
        aggregateType: "supplier",
        aggregateId: supplier.id,
        payload: { name: supplier.name, status: supplier.status },
      });

      return supplier;
    });
  }

  // Fallback for tests that pass repositories directly
  if (!input.parties || !input.audit || !input.outbox) {
    throw new Error("Either prisma or all repositories (parties, audit, outbox) must be provided");
  }

  const supplier = await input.parties.createSupplier({
    tenantId: input.tenantId,
    fields,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "supplier.created",
    resource: "supplier",
    resourceId: supplier.id,
    metadata: { name: supplier.name },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "SupplierCreated",
    aggregateType: "supplier",
    aggregateId: supplier.id,
    payload: { name: supplier.name, status: supplier.status },
  });

  return supplier;
}

export async function updateSupplier(input: {
  tenantId: string;
  actorUserId: string;
  supplierId: string;
  fields: SupplierInput;
  parties?: PartyRepository;
  audit?: AuditRepository;
  outbox?: OutboxRepository;
  prisma?: PrismaClient;
}): Promise<Supplier> {
  const fields = normalizeSupplierInput(input.fields);

  // If prisma client is provided, use transaction
  if (input.prisma) {
    return input.prisma.$transaction(async (tx) => {
      const parties = createPrismaPartyRepository(tx);
      const audit = createPrismaAuditRepository(tx);
      const outbox = createPrismaOutboxRepository(tx);

      const existing = await parties.findSupplierById(
        input.tenantId,
        input.supplierId
      );
      if (!existing) {
        throw notFound();
      }
      if (existing.status === "INACTIVE") {
        throw alreadyInactive();
      }

      const supplier = await parties.updateSupplier({
        tenantId: input.tenantId,
        supplierId: input.supplierId,
        fields,
      });
      if (!supplier) {
        throw notFound();
      }

      await audit.append({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        action: "supplier.updated",
        resource: "supplier",
        resourceId: supplier.id,
        metadata: { name: supplier.name },
      });

      await outbox.persist({
        tenantId: input.tenantId,
        eventType: "SupplierUpdated",
        aggregateType: "supplier",
        aggregateId: supplier.id,
        payload: { name: supplier.name, status: supplier.status },
      });

      return supplier;
    });
  }

  // Fallback for tests that pass repositories directly
  if (!input.parties || !input.audit || !input.outbox) {
    throw new Error("Either prisma or all repositories (parties, audit, outbox) must be provided");
  }

  const existing = await input.parties.findSupplierById(
    input.tenantId,
    input.supplierId
  );
  if (!existing) {
    throw notFound();
  }
  if (existing.status === "INACTIVE") {
    throw alreadyInactive();
  }

  const supplier = await input.parties.updateSupplier({
    tenantId: input.tenantId,
    supplierId: input.supplierId,
    fields,
  });
  if (!supplier) {
    throw notFound();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "supplier.updated",
    resource: "supplier",
    resourceId: supplier.id,
    metadata: { name: supplier.name },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "SupplierUpdated",
    aggregateType: "supplier",
    aggregateId: supplier.id,
    payload: { name: supplier.name, status: supplier.status },
  });

  return supplier;
}

export async function getSupplier(input: {
  tenantId: string;
  supplierId: string;
  parties: PartyRepository;
}): Promise<Supplier> {
  const supplier = await input.parties.findSupplierById(
    input.tenantId,
    input.supplierId
  );
  if (!supplier) {
    throw notFound();
  }
  return supplier;
}

export async function listSuppliersPage(input: {
  tenantId: string;
  query?: string;
  status?: PartyStatus | "ALL";
  page: number;
  pageSize: import("@/modules/shared-kernel/list-page").PageSize;
  parties: PartyRepository;
}) {
  return input.parties.listSuppliersPage({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function listSuppliers(input: {
  tenantId: string;
  query?: string;
  status?: PartyStatus | "ALL";
  parties: PartyRepository;
}): Promise<Supplier[]> {
  return input.parties.listSuppliers({
    tenantId: input.tenantId,
    query: input.query,
    status: input.status,
  });
}

export async function deactivateSupplier(input: {
  tenantId: string;
  actorUserId: string;
  supplierId: string;
  parties?: PartyRepository;
  audit?: AuditRepository;
  outbox?: OutboxRepository;
  prisma?: PrismaClient;
}): Promise<Supplier> {
  // If prisma client is provided, use transaction
  if (input.prisma) {
    return input.prisma.$transaction(async (tx) => {
      const parties = createPrismaPartyRepository(tx);
      const audit = createPrismaAuditRepository(tx);
      const outbox = createPrismaOutboxRepository(tx);

      const existing = await parties.findSupplierById(
        input.tenantId,
        input.supplierId
      );
      if (!existing) {
        throw notFound();
      }
      if (existing.status === "INACTIVE") {
        throw alreadyInactive();
      }

      const supplier = await parties.deactivateSupplier(
        input.tenantId,
        input.supplierId
      );
      if (!supplier) {
        throw notFound();
      }

      await audit.append({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        action: "supplier.deactivated",
        resource: "supplier",
        resourceId: supplier.id,
        metadata: { name: supplier.name },
      });

      await outbox.persist({
        tenantId: input.tenantId,
        eventType: "SupplierDeactivated",
        aggregateType: "supplier",
        aggregateId: supplier.id,
        payload: { name: supplier.name, status: supplier.status },
      });

      return supplier;
    });
  }

  // Fallback for tests that pass repositories directly
  if (!input.parties || !input.audit || !input.outbox) {
    throw new Error("Either prisma or all repositories (parties, audit, outbox) must be provided");
  }

  const existing = await input.parties.findSupplierById(
    input.tenantId,
    input.supplierId
  );
  if (!existing) {
    throw notFound();
  }
  if (existing.status === "INACTIVE") {
    throw alreadyInactive();
  }

  const supplier = await input.parties.deactivateSupplier(
    input.tenantId,
    input.supplierId
  );
  if (!supplier) {
    throw notFound();
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "supplier.deactivated",
    resource: "supplier",
    resourceId: supplier.id,
    metadata: { name: supplier.name },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "SupplierDeactivated",
    aggregateType: "supplier",
    aggregateId: supplier.id,
    payload: { name: supplier.name, status: supplier.status },
  });

  return supplier;
}
