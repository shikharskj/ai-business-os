"use client";

import { Suspense } from "react";

import { FlashToastHandler } from "@/components/shell/flash-toast-handler";
import { Toaster } from "@/components/ui/toast";

export function AppFeedbackProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toaster timeout={5000} limit={3}>
      {children}
      <Suspense fallback={null}>
        <FlashToastHandler />
      </Suspense>
    </Toaster>
  );
}
