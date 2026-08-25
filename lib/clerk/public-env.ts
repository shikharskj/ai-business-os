/** Clerk client config from NEXT_PUBLIC_* env (safe for Server Components / layout). */

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function getClerkPublishableKey(): string {
  const key = read("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to .env for local dev, or to Netlify/Vercel environment variables (Production + Deploy previews), then redeploy."
    );
  }
  return key;
}

export function getClerkProviderUrls() {
  return {
    signInUrl: read("NEXT_PUBLIC_CLERK_SIGN_IN_URL") ?? "/sign-in",
    signUpUrl: read("NEXT_PUBLIC_CLERK_SIGN_UP_URL") ?? "/sign-up",
    signInFallbackRedirectUrl:
      read("NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL") ?? "/app",
    signUpFallbackRedirectUrl:
      read("NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL") ?? "/app",
  };
}
