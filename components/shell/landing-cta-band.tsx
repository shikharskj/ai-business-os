import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingCtaBand() {
  return (
    <section className="px-6 pb-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 rounded-md bg-primary px-6 py-12 text-center text-primary-foreground md:px-12">
        <h2 className="text-2xl font-semibold tracking-tight">
          Ready to run your business with clarity?
        </h2>
        <p className="max-w-lg text-base text-primary-foreground/80">
          Create your account and set up your workspace — GST-ready books and a
          Daily Brief that shows what needs attention.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            size="lg"
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            nativeButton={false}
            render={<Link href="/sign-up" />}
          >
            Create account
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            nativeButton={false}
            render={<Link href="/sign-in" />}
          >
            Sign in
          </Button>
        </div>
      </div>
    </section>
  );
}
