import Image from "next/image";

import { cn } from "@/lib/utils";

type LandingProductShotProps = {
  src: string;
  /** When set, shown in dark mode via theme class swap. */
  darkSrc?: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  showCaption?: boolean;
  /** Extra classes on the framed image container (e.g. fixed height crop). */
  frameClassName?: string;
  imageClassName?: string;
};

export function LandingProductShot({
  src,
  darkSrc,
  alt,
  width = 1024,
  height = 644,
  priority = false,
  className,
  showCaption = true,
  frameClassName,
  imageClassName,
}: LandingProductShotProps) {
  return (
    <figure className={cn("flex w-full flex-col gap-2", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-md border border-border bg-card shadow-sm",
          frameClassName
        )}
      >
        {darkSrc ? (
          <>
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              priority={priority}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1100px"
              className={cn("h-auto w-full dark:hidden", imageClassName)}
            />
            <Image
              src={darkSrc}
              alt={alt}
              width={width}
              height={height}
              priority={priority}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1100px"
              className={cn("hidden h-auto w-full dark:block", imageClassName)}
            />
          </>
        ) : (
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1100px"
            className={cn("h-auto w-full", imageClassName)}
          />
        )}
      </div>
      {showCaption ? (
        <figcaption className="text-center text-xs text-muted-foreground md:text-left">
          Product UI (demo workspace)
        </figcaption>
      ) : null}
    </figure>
  );
}
