"use client";

import { useCallback, useState } from "react";
import { applyFormError, applyApiResponseError, type ApiErrorPayload } from "@/lib/api/validation";

export function useFormFeedback() {
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  const clear = useCallback(() => {
    setWarning("");
    setError("");
  }, []);

  const showWarning = useCallback((message: string) => {
    setError("");
    setWarning(message);
  }, []);

  const showError = useCallback((message: string) => {
    setWarning("");
    setError(message);
  }, []);

  const applyError = useCallback(
    (err: unknown, fallback = "Something went wrong. Please try again.") => {
      applyFormError(err, { setWarning, setError, clear }, fallback);
    },
    [clear]
  );

  const applyResponseError = useCallback(
    (data: { error?: ApiErrorPayload }, fallback = "Request failed") => {
      applyApiResponseError(data, { setWarning, setError, clear }, fallback);
    },
    [clear]
  );

  return {
    warning,
    error,
    clear,
    showWarning,
    showError,
    applyError,
    applyResponseError,
  };
}
