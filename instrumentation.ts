export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "development"
  ) {
    const { installDevOutputFormatting } = await import(
      "@/lib/observability/install-dev-output"
    );
    installDevOutputFormatting();
  }
}
