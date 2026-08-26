import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { LandingProductShot } from "@/components/shell/landing-product-shot";
import { OfhikosCredit } from "@/components/shell/ofhikos-credit";
import { PublicBrand } from "@/components/shell/public-brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export type AuthSplitCapability = {
  icon: LucideIcon;
  label: string;
};

type AuthSplitLayoutProps = {
  headline: string;
  description: string;
  capabilities?: AuthSplitCapability[];
  /** @deprecated Mobile no longer shows a marketing strip; kept for call-site compatibility. */
  mobileCapability?: string;
  children: ReactNode;
};

export function AuthSplitLayout({
  headline,
  description,
  capabilities = [],
  children,
}: AuthSplitLayoutProps) {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-muted/30 p-0 md:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 md:grid-cols-2 md:rounded-md md:border md:border-border">
        <aside className="hidden flex-col gap-4 bg-primary p-8 text-primary-foreground md:flex md:min-h-128 md:justify-between md:gap-6">
          <div className="flex flex-col gap-6">
            <PublicBrand inverted size="sm" />
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both">
                {headline}
              </h1>
              <p className="text-base text-primary-foreground/80 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100 motion-safe:fill-mode-both">
                {description}
              </p>
            </div>
          </div>

          {capabilities.length > 0 ? (
            <ul className="flex flex-col gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-200 motion-safe:fill-mode-both">
              {capabilities.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-3 text-base">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-foreground/10">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-primary-foreground/90">{label}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-auto motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:delay-300 motion-safe:fill-mode-both">
            <LandingProductShot
              src="/landing/dashboard-light.png"
              darkSrc="/landing/dashboard-dark.png"
              alt=""
              showCaption={false}
              frameClassName="max-h-36 border-primary-foreground/15 bg-primary-foreground/5 shadow-none"
              imageClassName="h-36 w-full max-w-full object-cover object-top opacity-90"
            />
          </div>
        </aside>

        <div className="relative flex min-h-svh flex-col md:min-h-0">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 md:border-b-0 md:px-8 md:pt-4">
            <PublicBrand size="sm" className="md:hidden" />
            <Link
              href="/"
              className="hidden rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:inline"
            >
              Back to home
            </Link>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
            <div className="w-full max-w-sm">{children}</div>
            <OfhikosCredit className="pb-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
