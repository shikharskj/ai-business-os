import Image from "next/image";

import { cn } from "@/lib/utils";

type LandingProductShotProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  showCaption?: boolean;
};

export function LandingProductShot({
  src,
  alt,
  width = 1024,
  height = 644,
  priority = false,
  className,
  showCaption = true,
}: LandingProductShotProps) {
  return (
    <figure className={cn("flex w-full flex-col gap-2", className)}>
      <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1100px"
          className="h-auto w-full"
        />
      </div>
      {showCaption ? (
        <figcaption className="text-center text-xs text-muted-foreground md:text-left">
          Product UI (demo workspace)
        </figcaption>
      ) : null}
    </figure>
  );
}
