import { beforeEach, describe, expect, it, vi } from "vitest";

const runOutboxProcessing = vi.hoisted(() =>
  vi.fn(async () => ({
    processed: 0,
    failed: 0,
  }))
);

const listAllTenantIds = vi.hoisted(() => vi.fn(async () => ["tenant-a"]));

vi.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: "test-cron-secret",
    NODE_ENV: "test",
  },
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {},
}));

vi.mock("@/modules/events/application/run-outbox-processing", () => ({
  runOutboxProcessing,
}));

vi.mock("@/modules/events/infrastructure/prisma-outbox-dispatch", () => ({
  createPrismaOutboxDispatchRepository: () => ({}),
}));

vi.mock("@/modules/business-state/infrastructure/prisma-consumer-deps", () => ({
  createPrismaBusinessStateConsumerDeps: () => ({}),
}));

vi.mock("@/modules/workflows/infrastructure/prisma-runtime-deps", () => ({
  createPrismaAutomationRuntimeDeps: () => ({}),
}));

vi.mock("@/modules/notifications", () => ({
  createInAppChannel: () => ({}),
  createPrismaNotificationContextRepository: () => ({
    listAllTenantIds,
  }),
  createPrismaNotificationRepository: () => ({}),
}));

describe("POST /api/internal/outbox/process auth", () => {
  beforeEach(() => {
    runOutboxProcessing.mockClear();
    listAllTenantIds.mockClear();
  });

  it("rejects missing Authorization when CRON_SECRET is configured", async () => {
    const { POST } = await import("@/app/api/internal/outbox/process/route");
    const response = await POST(
      new Request("http://localhost/api/internal/outbox/process", {
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    expect(runOutboxProcessing).not.toHaveBeenCalled();
  });

  it("rejects wrong Bearer token", async () => {
    const { POST } = await import("@/app/api/internal/outbox/process/route");
    const response = await POST(
      new Request("http://localhost/api/internal/outbox/process", {
        method: "POST",
        headers: { Authorization: "Bearer wrong-secret" },
      })
    );

    expect(response.status).toBe(401);
    expect(runOutboxProcessing).not.toHaveBeenCalled();
  });

  it("allows matching Bearer token and runs processing", async () => {
    const { POST } = await import("@/app/api/internal/outbox/process/route");
    const response = await POST(
      new Request("http://localhost/api/internal/outbox/process", {
        method: "POST",
        headers: { Authorization: "Bearer test-cron-secret" },
        body: JSON.stringify({ tenantIds: ["tenant-a"] }),
      })
    );

    expect(response.status).toBe(200);
    expect(runOutboxProcessing).toHaveBeenCalledOnce();
  });
});
