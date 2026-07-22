"use client";

import { notify } from "@/shared/lib/notify";
import { useErrorMessage } from "@/shared/hooks/use-error-message";

export function useNotifyError() {
  const getErrorMessage = useErrorMessage();

  return (error: unknown) => {
    notify.error(getErrorMessage(error));
  };
}
