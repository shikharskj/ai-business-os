/**
 * Light “paper” palette for GST tax-invoice PDF export.
 * Mirrors light-mode semantic tokens from the product theme so printed
 * invoices stay readable even when the app is in dark mode.
 * Live HTML preview uses CSS semantic classes instead of these hex values.
 */
export const INVOICE_DOCUMENT_PAPER = {
  card: "#ffffff",
  foreground: "#18181b",
  muted: "#71717a",
  mutedBody: "#52525b",
  border: "#e4e4e7",
  borderStrong: "#d4d4d8",
  primary: "#27272a",
  onPrimary: "#fafafa",
} as const;

export const INVOICE_DOCUMENT_LAYOUT = {
  pageMargin: 40,
  pageWidth: 595.28,
  logoSize: 56,
  lettermarkRadius: 6,
} as const;

export const INVOICE_DOCUMENT_CONTENT_WIDTH =
  INVOICE_DOCUMENT_LAYOUT.pageWidth - INVOICE_DOCUMENT_LAYOUT.pageMargin * 2;
