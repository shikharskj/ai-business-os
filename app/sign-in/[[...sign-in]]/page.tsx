import { SignIn } from "@clerk/nextjs";

import { AuthChrome } from "@/components/shell/auth-chrome";

export default function SignInPage() {
  return (
    <>
      <AuthChrome />
      <div className="flex flex-1 items-center justify-center p-6">
        <SignIn />
      </div>
    </>
  );
}
