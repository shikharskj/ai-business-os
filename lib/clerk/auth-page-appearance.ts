import { BookOpen, FileText, Sparkles } from "lucide-react";

import type { AuthSplitCapability } from "@/components/shell/auth-split-layout";

/** Clerk appearance for page-mounted SignIn / SignUp inside AuthSplitLayout. */
export const AUTH_PAGE_APPEARANCE = {
  options: {
    elevation: "flush" as const,
  },
  elements: {
    // Brand lives in the left panel — hide Clerk's default logo.
    logoBox: "hidden",
    logoImage: "hidden",
    rootBox: "mx-auto w-full max-w-sm",
    cardBox: "w-full shadow-none border-0",
    headerTitle: "text-xl font-semibold tracking-tight md:text-2xl",
    headerSubtitle: "text-sm text-muted-foreground md:text-base",
    formFieldLabel: "text-sm font-medium",
    formFieldInput: "h-10 rounded-md text-base",
    formButtonPrimary: "h-10 rounded-md text-base",
    footerActionLink: "font-medium",
  },
};

export const SIGN_IN_CAPABILITIES: AuthSplitCapability[] = [
  {
    icon: BookOpen,
    label: "Pick up where you left off in your workspace",
  },
  {
    icon: FileText,
    label: "Sales, purchases, and GST-ready records",
  },
  {
    icon: Sparkles,
    label: "Daily Brief on what needs attention today",
  },
];

export const SIGN_UP_CAPABILITIES: AuthSplitCapability[] = [
  {
    icon: FileText,
    label: "Set up GST-ready invoices and quotations",
  },
  {
    icon: BookOpen,
    label: "Track purchases, expenses, and stock in one place",
  },
  {
    icon: Sparkles,
    label: "Get a grounded AI companion for your business",
  },
];
