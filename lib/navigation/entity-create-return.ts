export type EntityKind = "customer" | "product" | "supplier";

export type EntityCreateReturnPath =
  | "/app/sales/invoices/new"
  | "/app/sales/quotations/new"
  | "/app/sales/orders/new"
  | "/app/sales/payments/new"
  | "/app/purchases/bills/new"
  | "/app/purchases/payments/new";

const ENTITY_CREATE_PATHS: Record<EntityKind, string> = {
  customer: "/app/sales/customers/new",
  product: "/app/inventory/products/new",
  supplier: "/app/purchases/suppliers/new",
};

const RETURN_TARGET_CONFIG: Record<
  EntityCreateReturnPath,
  {
    customerId?: boolean;
    supplierId?: boolean;
    productId?: boolean;
    lineIndex?: boolean;
    backLabel: string;
  }
> = {
  "/app/sales/invoices/new": {
    customerId: true,
    productId: true,
    lineIndex: true,
    backLabel: "Back to new invoice",
  },
  "/app/sales/quotations/new": {
    customerId: true,
    productId: true,
    lineIndex: true,
    backLabel: "Back to new quotation",
  },
  "/app/sales/orders/new": {
    customerId: true,
    productId: true,
    lineIndex: true,
    backLabel: "Back to new sales order",
  },
  "/app/sales/payments/new": {
    customerId: true,
    backLabel: "Back to record payment",
  },
  "/app/purchases/bills/new": {
    supplierId: true,
    productId: true,
    lineIndex: true,
    backLabel: "Back to new bill",
  },
  "/app/purchases/payments/new": {
    supplierId: true,
    backLabel: "Back to record payment",
  },
};

const ALLOWED_RETURN_PATHS = new Set<string>(
  Object.keys(RETURN_TARGET_CONFIG)
);

const ALLOWED_PRESERVE_QUERY_KEYS = new Set([
  "customerId",
  "supplierId",
  "productId",
  "lineIndex",
  "advance",
]);

function isAllowedReturnPath(pathname: string): pathname is EntityCreateReturnPath {
  return ALLOWED_RETURN_PATHS.has(pathname);
}

function parsePathAndQuery(value: string): { pathname: string; searchParams: URLSearchParams } | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("://") || trimmed.includes("..")) {
    return null;
  }

  let pathname = trimmed;
  let search = "";
  const queryIndex = trimmed.indexOf("?");
  if (queryIndex >= 0) {
    pathname = trimmed.slice(0, queryIndex);
    search = trimmed.slice(queryIndex + 1);
  }

  if (!pathname.startsWith("/app/")) {
    return null;
  }

  return {
    pathname,
    searchParams: new URLSearchParams(search),
  };
}

export function parseReturnTo(
  value: string | null | undefined
): EntityCreateReturnPath | null {
  const parsed = parseReturnToValue(value);
  return parsed?.pathname ?? null;
}

export function parseReturnToValue(
  value: string | null | undefined
): { pathname: EntityCreateReturnPath; href: string } | null {
  if (!value) {
    return null;
  }

  const parsed = parsePathAndQuery(value);
  if (!parsed || !isAllowedReturnPath(parsed.pathname)) {
    return null;
  }

  const config = RETURN_TARGET_CONFIG[parsed.pathname];
  for (const key of parsed.searchParams.keys()) {
    if (!ALLOWED_PRESERVE_QUERY_KEYS.has(key)) {
      return null;
    }
    if (key === "customerId" && !config.customerId) {
      return null;
    }
    if (key === "supplierId" && !config.supplierId) {
      return null;
    }
    if (key === "productId" && !config.productId) {
      return null;
    }
    if (key === "lineIndex" && !config.lineIndex) {
      return null;
    }
  }

  const search = parsed.searchParams.toString();
  return {
    pathname: parsed.pathname,
    href: search ? `${parsed.pathname}?${search}` : parsed.pathname,
  };
}

export function buildReturnToUrl(
  basePath: EntityCreateReturnPath,
  query?: Record<string, string | undefined>
): string {
  const config = RETURN_TARGET_CONFIG[basePath];
  const params = new URLSearchParams();

  if (query?.customerId && config.customerId) {
    params.set("customerId", query.customerId);
  }
  if (query?.supplierId && config.supplierId) {
    params.set("supplierId", query.supplierId);
  }
  if (query?.productId && config.productId) {
    params.set("productId", query.productId);
  }
  if (query?.lineIndex && config.lineIndex) {
    params.set("lineIndex", query.lineIndex);
  }
  if (query?.advance === "1" && basePath === "/app/sales/payments/new") {
    params.set("advance", "1");
  }

  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export function buildEntityCreateHref(input: {
  entity: EntityKind;
  returnTo: EntityCreateReturnPath;
  preserveQuery?: Record<string, string | undefined>;
}): string {
  const returnTo = buildReturnToUrl(input.returnTo, input.preserveQuery);
  const params = new URLSearchParams({ returnTo });
  return `${ENTITY_CREATE_PATHS[input.entity]}?${params.toString()}`;
}

export function buildRedirectAfterEntityCreate(input: {
  entity: EntityKind;
  entityId: string;
  returnTo: string;
}): string | null {
  const parsed = parsePathAndQuery(input.returnTo);
  if (!parsed || !isAllowedReturnPath(parsed.pathname)) {
    return null;
  }

  const config = RETURN_TARGET_CONFIG[parsed.pathname];
  const params = new URLSearchParams(parsed.searchParams);

  if (input.entity === "customer" && config.customerId) {
    params.set("customerId", input.entityId);
  } else if (input.entity === "supplier" && config.supplierId) {
    params.set("supplierId", input.entityId);
  } else if (input.entity === "product" && config.productId) {
    params.set("productId", input.entityId);
  } else {
    return null;
  }

  params.set("entityCreated", input.entity);
  const search = params.toString();
  return search ? `${parsed.pathname}?${search}` : parsed.pathname;
}

export function returnToBackLabel(returnTo: EntityCreateReturnPath): string {
  return RETURN_TARGET_CONFIG[returnTo].backLabel;
}

export function parseReturnToFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams
): EntityCreateReturnPath | null {
  const raw =
    searchParams instanceof URLSearchParams
      ? searchParams.get("returnTo")
      : Array.isArray(searchParams.returnTo)
        ? searchParams.returnTo[0]
        : searchParams.returnTo;
  return parseReturnTo(raw ?? null);
}

export function resolveInitialEntityId(
  candidates: { id: string }[],
  preferredId?: string | null
): string {
  if (preferredId && candidates.some((row) => row.id === preferredId)) {
    return preferredId;
  }
  return candidates[0]?.id ?? "";
}

export function parseInitialLineIndex(value?: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  // Reject non-integer inputs (e.g., "3.14", "3e10", "abc", "3abc")
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  // Reject negative, non-safe integers, or values exceeding the maximum supported lines (1000)
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 1000) {
    return undefined;
  }
  return parsed;
}
