import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

import { AuthSplitLayout } from "@/components/shell/auth-split-layout";
import {
  AUTH_PAGE_APPEARANCE,
  SIGN_IN_CAPABILITIES,
} from "@/lib/clerk/auth-page-appearance";

export const metadata: Metadata = {
  title: "Sign in · AI Business OS",
  description: "Sign in to continue managing your business workspace.",
};

export default function SignInPage() {
  return (
    <AuthSplitLayout
      headline="Welcome back"
      description="Sign in to continue managing your business workspace."
      capabilities={SIGN_IN_CAPABILITIES}
      mobileCapability="Continue where you left off in your workspace"
    >
      <SignIn appearance={AUTH_PAGE_APPEARANCE} />
    </AuthSplitLayout>
  );
}
