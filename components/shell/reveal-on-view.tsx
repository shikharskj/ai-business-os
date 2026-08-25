"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealOnViewProps = {
  children: ReactNode;
  className?: string;
};

/**
 * One-shot fade/rise when the block enters the viewport.
 * Skips animation when prefers-reduced-motion is set.
 * Without JS, content stays visible (no data-reveal attribute).
 * Visibility is driven via DOM data attributes to avoid setState-in-effect.
 */
export function RevealOnView({ children, className }: RevealOnViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    el.dataset.reveal = "pending";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.reveal = "visible";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "data-[reveal=pending]:opacity-0",
        "data-[reveal=visible]:motion-safe:animate-in data-[reveal=visible]:motion-safe:fade-in data-[reveal=visible]:motion-safe:slide-in-from-bottom-4 data-[reveal=visible]:motion-safe:duration-500 data-[reveal=visible]:motion-safe:fill-mode-both",
        className
      )}
    >
      {children}
    </div>
  );
}
