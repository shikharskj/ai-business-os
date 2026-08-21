import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { authorize, AuthorizationError } from "@/lib/security/authorize";
import {
  createPrismaAccountRepository,
  createPrismaJournalRepository,
} from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { cashPositionToDto, getCashPosition } from "@/modules/business-state";
import { TenantRequiredError } from "@/modules/tenant/domain/errors";

/**
 * Cash position from ledger cash/bank account balances (not unpaid invoices).
 * Authz: report:read. Money facts include currency, scale, and fact ids.
 *
 * This is the authorized read path for AI and later UI/assistant citation.
 * The BusinessState CashPosition projection is the same numbers, rebuilt from
 * the same ledger query after payment/expense/journal events.
 */
export async function GET() {
  try {
    const tenant = await authorize("report:read");
    const snapshot = await getCashPosition({
      tenantId: tenant.tenantId,
      currency: tenant.business.currency,
      accounts: createPrismaAccountRepository(prisma),
      journals: createPrismaJournalRepository(prisma),
    });
    return NextResponse.json(cashPositionToDto(snapshot));
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
