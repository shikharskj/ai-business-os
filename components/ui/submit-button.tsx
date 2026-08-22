"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type SubmitButtonProps = ComponentProps<typeof Button> & {
  pending?: boolean;
  pendingLabel?: string;
};

export function SubmitButton({
  pending = false,
  pendingLabel,
  disabled,
  children,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(pending && "min-w-[7.5rem]", className)}
      {...props}
    >
      {pending ? <Spinner className="size-4" /> : null}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
