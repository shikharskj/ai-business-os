const PUBLIC_EXACT_PATHS = new Set(["/"]);

const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/api/webhooks/clerk",
  "/__clerk",
];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
