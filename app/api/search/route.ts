import { NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/security";
import { requireCurrentTenant } from "@/lib/tenant/current-tenant";
import { prisma } from "@/lib/db/client";
import {
  createPrismaSearchRepository,
  SearchError,
  searchBusinessRecords,
  searchQuerySchema,
} from "@/modules/search";
import { businessDate } from "@/modules/shared-kernel/dates";
import { TenantRequiredError } from "@/modules/tenant/domain/errors";

export async function GET(request: Request) {
  try {
    const tenant = await requireCurrentTenant();
    const url = new URL(request.url);
    const parsed = searchQuerySchema.safeParse({
      q: url.searchParams.get("q") ?? "",
      type: url.searchParams.get("type") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid search query." },
        { status: 400 }
      );
    }

    const result = await searchBusinessRecords({
      tenantId: tenant.tenantId,
      role: tenant.membership.role,
      query: parsed.data.q,
      type: parsed.data.type,
      status: parsed.data.status,
      fromDate: parsed.data.from ? businessDate(parsed.data.from) : undefined,
      toDate: parsed.data.to ? businessDate(parsed.data.to) : undefined,
      limit: parsed.data.limit,
      search: createPrismaSearchRepository(prisma),
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof SearchError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
