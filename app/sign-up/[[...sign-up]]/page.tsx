import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

import { AuthSplitLayout } from "@/components/shell/auth-split-layout";
import {
  AUTH_PAGE_APPEARANCE,
  SIGN_UP_CAPABILITIES,
} from "@/lib/clerk/auth-page-appearance";

export const metadata: Metadata = {
  title: "Sign up · AI Business OS",
  description: "Create your account to set up your business workspace.",
};

export default function SignUpPage() {
  return (
    <AuthSplitLayout
      headline="Get started"
      description="Create your account to set up your business workspace."
      capabilities={SIGN_UP_CAPABILITIES}
      mobileCapability="Create your GST-ready business workspace"
    >
      <SignUp appearance={AUTH_PAGE_APPEARANCE} />
    </AuthSplitLayout>
  );
}
