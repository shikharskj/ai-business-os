import "server-only";

import { timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";

/**
 * Authorize `/api/internal/outbox/process` (and similar cron entrypoints).
 * Authz = Bearer CRON_SECRET only; fail closed in production if secret missing.
 * Returns an error response when unauthorized; null when allowed.
 */
export function authorizeCronRequest(
  request: Request,
  options: {
    cronSecret: string | undefined;
    nodeEnv: string;
  }
): NextResponse | null {
  const configured = options.cronSecret;

  if (configured) {
    const header = request.headers.get("authorization");
    const expected = `Bearer ${configured}`;

    if (!header || header.length !== expected.length) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const headerBuf = Buffer.from(header);
    const expectedBuf = Buffer.from(expected);

    if (!timingSafeEqual(headerBuf, expectedBuf)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null;
  }

  if (options.nodeEnv === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is required in production." },
      { status: 503 }
    );
  }

  return null;
}
