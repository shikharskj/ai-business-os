import type { ReactNode } from "react";

import { LandingProductShot } from "@/components/shell/landing-product-shot";
import { cn } from "@/lib/utils";

type LandingFeatureBandProps = {
  id?: string;
  title: string;
  description: string;
  bullets: string[];
  imageSrc: string;
  imageAlt: string;
  /** When true, image appears on the left on desktop. */
  reverse?: boolean;
  muted?: boolean;
  imagePriority?: boolean;
  children?: ReactNode;
};

export function LandingFeatureBand({
  id,
  title,
  description,
  bullets,
  imageSrc,
  imageAlt,
  reverse = false,
  muted = false,
  imagePriority = false,
}: LandingFeatureBandProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 border-t border-border px-6 py-16",
        muted ? "bg-muted/40" : "bg-background"
      )}
    >
      <div
        className={cn(
          "mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-2",
          reverse && "md:[&>*:first-child]:order-2"
        )}
      >
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-base text-muted-foreground">{description}</p>
          <ul className="flex flex-col gap-2">
            {bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex gap-2 text-base text-muted-foreground"
              >
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground"
                  aria-hidden
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
        <LandingProductShot
          src={imageSrc}
          alt={imageAlt}
          priority={imagePriority}
        />
      </div>
    </section>
  );
}
