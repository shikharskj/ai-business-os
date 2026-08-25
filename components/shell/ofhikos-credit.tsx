import Image from "next/image";

import { cn } from "@/lib/utils";

type OfhikosCreditProps = {
  className?: string;
};

export function OfhikosCredit({ className }: OfhikosCreditProps) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted-foreground",
        className
      )}
    >
      <span>Made with ♥️ by</span>
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <Image
          src="/branding/ofhikos-light.png"
          alt=""
          width={255}
          height={310}
          className="h-5 w-auto dark:hidden"
          aria-hidden
        />
        <Image
          src="/branding/ofhikos-dark.png"
          alt=""
          width={255}
          height={310}
          className="hidden h-5 w-auto dark:block"
          aria-hidden
        />
        <span>ofhikos</span>
      </span>
    </p>
  );
}
