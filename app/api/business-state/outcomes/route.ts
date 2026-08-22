import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { authorize, AuthorizationError } from "@/lib/security/authorize";
import {
  automationOutcomeToDto,
  listCollectionsOutcomes,
} from "@/modules/business-state";
import { listCollectionsOutcomesQuerySchema } from "@/modules/business-state/schemas/attention.schema";
import { createPrismaAttentionQueueRepository } from "@/modules/business-state/infrastructure/prisma-attention-repository";
import { TenantRequiredError } from "@/modules/tenant/domain/errors";

/**
 * List collections learning outcomes (reminder proposed/sent, paid after).
 * Authz: report:read.
 */
export async function GET(request: Request) {
  try {
    const tenant = await authorize("report:read");
    const url = new URL(request.url);
    const parsed = listCollectionsOutcomesQuerySchema.safeParse({
      invoiceId: url.searchParams.get("invoiceId") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const outcomes = await listCollectionsOutcomes({
      tenantId: tenant.tenantId,
      invoiceId: parsed.data.invoiceId,
      attention: createPrismaAttentionQueueRepository(prisma),
    });
    return NextResponse.json({
      outcomes: outcomes.map(automationOutcomeToDto),
    });
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
