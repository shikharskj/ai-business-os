"use client";

import { useEffect, useRef } from "react";

import { notifyError } from "@/lib/feedback/toast";

type ActionFeedbackState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export function useActionFeedback(
  state: ActionFeedbackState,
  {
    errorTitle = "Something went wrong",
    errorDescription,
  }: {
    errorTitle?: string;
    errorDescription?: string;
  } = {}
) {
  const lastErrorRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!state.error || state.error === lastErrorRef.current) {
      return;
    }

    lastErrorRef.current = state.error;
    notifyError(errorTitle, errorDescription ?? state.error);
  }, [errorDescription, errorTitle, state.error]);
}
