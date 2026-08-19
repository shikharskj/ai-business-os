// Clerk shadcn appearance theme — vendored to avoid @clerk/ui's Solana/Web3 deps.
export const shadcn = {
  name: "shadcn",
  cssLayerName: "components",
  variables: {
    colorBackground: "var(--card)",
    colorDanger: "var(--destructive)",
    colorForeground: "var(--card-foreground)",
    colorInput: "var(--input)",
    colorInputForeground: "var(--card-foreground)",
    colorModalBackdrop: "color-mix(in srgb, var(--color-black), transparent 50%)",
    colorMuted: "var(--muted)",
    colorMutedForeground: "var(--muted-foreground)",
    colorNeutral: "var(--foreground)",
    colorPrimary: "var(--primary)",
    colorPrimaryForeground: "var(--primary-foreground)",
    colorRing: "color-mix(in srgb, var(--ring), transparent 50%)",
    fontWeight: {
      normal: "var(--font-weight-normal)",
      medium: "var(--font-weight-medium)",
      semibold: "var(--font-weight-semibold)",
      bold: "var(--font-weight-bold)",
    },
  },
  elements: {
    input: "bg-transparent dark:bg-input/30",
    cardBox:
      "shadow-sm border data-[elevation=flush]:shadow-none data-[elevation=flush]:border-0",
    popoverBox: "shadow-sm border",
    button: { '&[data-variant="solid"]::after': { display: "none" } },
  },
  __type: "prebuilt_appearance" as const,
};
