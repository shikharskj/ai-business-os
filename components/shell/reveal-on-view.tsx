"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type RevealOnViewProps = {
  children: ReactNode;
  className?: string;
};

/**
 * One-shot fade/rise when the block enters the viewport.
 * Skips animation when prefers-reduced-motion is set.
 * Without JS, content stays visible (no opacity hide until mount).
 */
export function RevealOnView({ children, className }: RevealOnViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    setMounted(true);

    if (reduceMotion) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
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
        mounted &&
          !visible &&
          "opacity-0",
        visible &&
          "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500 motion-safe:fill-mode-both",
        className
      )}
    >
      {children}
    </div>
  );
}
