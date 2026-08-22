"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  resolveFlashToast,
  stripFlashParams,
} from "@/lib/feedback/flash-toast-map";
import {
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
} from "@/lib/feedback/toast";

export function FlashToastHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const flash = resolveFlashToast(pathname, params);
    if (!flash) {
      return;
    }

    const flashKey = `${pathname}?${flash.paramKeys.map((key) => `${key}=${params.get(key)}`).join("&")}`;
    if (handledKeyRef.current === flashKey) {
      return;
    }
    handledKeyRef.current = flashKey;

    const { title, description, type = "success" } = flash.message;
    if (type === "error") {
      notifyError(title, description);
    } else if (type === "warning") {
      notifyWarning(title, description);
    } else if (type === "info") {
      notifyInfo(title, description);
    } else {
      notifySuccess(title, description);
    }

    const nextParams = stripFlashParams(params, flash.paramKeys);
    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
