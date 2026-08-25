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
  /** Short line shown under the brand strip on small screens. Defaults to first capability. */
  mobileCapability?: string;
  children: ReactNode;
};

export function AuthSplitLayout({
  headline,
  description,
  capabilities = [],
  mobileCapability,
  children,
}: AuthSplitLayoutProps) {
  const mobileLine =
    mobileCapability ?? (capabilities.length > 0 ? capabilities[0].label : null);

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-muted/30 p-4 md:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-md border border-border bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 md:grid-cols-2">
        <aside className="flex flex-col gap-4 bg-primary p-6 text-primary-foreground md:min-h-128 md:justify-between md:gap-6 md:p-8">
          <div className="flex flex-col gap-4 md:gap-6">
            <PublicBrand inverted size="sm" />
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both">
                {headline}
              </h1>
              <p className="text-base text-primary-foreground/80 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100 motion-safe:fill-mode-both">
                {description}
              </p>
            </div>
            {mobileLine ? (
              <p className="text-sm text-primary-foreground/70 md:hidden">
                {mobileLine}
              </p>
            ) : null}
          </div>

          {capabilities.length > 0 ? (
            <ul className="hidden flex-col gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-200 motion-safe:fill-mode-both md:flex">
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

          <div className="mt-auto hidden motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:delay-300 motion-safe:fill-mode-both md:block">
            <LandingProductShot
              src="/landing/dashboard-light.png"
              darkSrc="/landing/dashboard-dark.png"
              alt=""
              showCaption={false}
              frameClassName="max-h-36 border-primary-foreground/15 bg-primary-foreground/5 shadow-none"
              imageClassName="h-36 w-full object-cover object-top opacity-90"
            />
          </div>
        </aside>

        <div className="relative flex flex-col">
          <div className="flex items-center justify-between gap-3 px-6 pt-4 md:px-8">
            <Link
              href="/"
              className="rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Back to home
            </Link>
            <ThemeToggle />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6 md:px-8 md:py-8">
            <div className="w-full max-w-sm">{children}</div>
            <OfhikosCredit className="pb-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
