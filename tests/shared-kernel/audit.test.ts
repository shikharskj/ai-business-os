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
});
