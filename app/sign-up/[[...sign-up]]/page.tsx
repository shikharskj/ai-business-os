import { SignUp } from "@clerk/nextjs";

import { AuthChrome } from "@/components/shell/auth-chrome";

export default function SignUpPage() {
  return (
    <>
      <AuthChrome />
      <div className="flex flex-1 items-center justify-center p-6">
        <SignUp />
      </div>
    </>
  );
}
