import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Binds a confirmation to the exact action that was previewed.
 *
 * Without this, a client could confirm arguments it never showed the user. The
 * token is not the authorization boundary — `executeAiTool` still re-checks
 * role, permission, tenant, schema, and the confirmation flag on every run.
 */
export type AiActionTokenPayload = {
  tenantId: string;
  actorUserId: string;
  toolName: string;
  argumentsJson: string;
  expiresAt: number;
};

const TOKEN_VERSION = 1;
export const AI_ACTION_TOKEN_TTL_MS = 10 * 60 * 1000;

type EncodedPayload = {
  v: number;
  t: string;
  u: string;
  n: string;
  a: string;
  e: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function signAiActionToken(input: {
  secret: string;
  payload: AiActionTokenPayload;
}): string {
  const encoded: EncodedPayload = {
    v: TOKEN_VERSION,
    t: input.payload.tenantId,
    u: input.payload.actorUserId,
    n: input.payload.toolName,
    a: input.payload.argumentsJson,
    e: input.payload.expiresAt,
  };

  const body = base64UrlEncode(JSON.stringify(encoded));
  return `${body}.${sign(input.secret, body)}`;
}

/**
 * Returns the payload only when the signature matches and the token is live.
 * The caller must still check that the payload's tenant and user match the
 * authenticated session.
 */
export function verifyAiActionToken(input: {
  secret: string;
  token: string;
  now?: number;
}): AiActionTokenPayload | null {
  const [body, signature] = input.token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = Buffer.from(sign(input.secret, body));
  const received = Buffer.from(signature);
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  const json = base64UrlDecode(body);
  if (!json) {
    return null;
  }

  let decoded: EncodedPayload;
  try {
    decoded = JSON.parse(json) as EncodedPayload;
  } catch {
    return null;
  }

  if (
    decoded.v !== TOKEN_VERSION ||
    typeof decoded.t !== "string" ||
    typeof decoded.u !== "string" ||
    typeof decoded.n !== "string" ||
    typeof decoded.a !== "string" ||
    typeof decoded.e !== "number"
  ) {
    return null;
  }

  if (decoded.e <= (input.now ?? Date.now())) {
    return null;
  }

  return {
    tenantId: decoded.t,
    actorUserId: decoded.u,
    toolName: decoded.n,
    argumentsJson: decoded.a,
    expiresAt: decoded.e,
  };
}
