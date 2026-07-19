"use client";

import { toast } from "sonner";
import { useErrorMessage } from "@/shared/hooks/use-error-message";

export function useNotifyError() {
  const getErrorMessage = useErrorMessage();

  return (error: unknown) => {
    toast.error(getErrorMessage(error));
  };
}
