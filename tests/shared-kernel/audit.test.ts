import { describe, expect, it } from "vitest";

import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";

describe("AuditRepository (memory)", () => {
  it("appends records", async () => {
    const repo = createMemoryAuditRepository();
    const result = await repo.append({
      tenantId: "t1",
      actorUserId: "u1",
      action: "create",
      resource: "Invoice",
      resourceId: "inv-1",
      metadata: { total: 50000 },
    });
    expect(result.id).toBeDefined();
    expect(repo.records).toHaveLength(1);
    expect(repo.records[0]!.action).toBe("create");
  });

  it("is append-only (no update/delete API)", () => {
    const repo = createMemoryAuditRepository();
    expect(repo).not.toHaveProperty("update");
    expect(repo).not.toHaveProperty("delete");
  });

  it("rejects unsupported metadata values", async () => {
    const repo = createMemoryAuditRepository();
    await expect(
      repo.append({
        tenantId: "t1",
        actorUserId: "u1",
        action: "create",
        resource: "Invoice",
        resourceId: "inv-1",
        metadata: { total: 1n },
      })
    ).rejects.toThrow("unsupported JSON");
  });

  it("lists records for a resource newest first and ignores other resources", async () => {
    const repo = createMemoryAuditRepository();
    await repo.append({
      tenantId: "t1",
      actorUserId: "u1",
      action: "invoice.created",
      resource: "invoice",
      resourceId: "inv-1",
    });
    await repo.append({
      tenantId: "t1",
      actorUserId: "u1",
      action: "invoice.posted",
      resource: "invoice",
      resourceId: "inv-1",
    });
    await repo.append({
      tenantId: "t1",
      actorUserId: "u1",
      action: "invoice.created",
      resource: "invoice",
      resourceId: "inv-2",
    });
    await repo.append({
      tenantId: "t2",
      actorUserId: "u1",
      action: "invoice.updated",
      resource: "invoice",
      resourceId: "inv-1",
    });

    const listed = await repo.listForResource({
      tenantId: "t1",
      resource: "invoice",
      resourceId: "inv-1",
    });
    expect(listed.map((row) => row.action)).toEqual([
      "invoice.posted",
      "invoice.created",
    ]);
    expect(listed[0]!.id).toBeDefined();
    expect(listed[0]!.createdAt).toBeInstanceOf(Date);

    const limited = await repo.listForResource({
      tenantId: "t1",
      resource: "invoice",
      resourceId: "inv-1",
      limit: 1,
    });
    expect(limited).toHaveLength(1);
    expect(limited[0]!.action).toBe("invoice.posted");
  });
});
