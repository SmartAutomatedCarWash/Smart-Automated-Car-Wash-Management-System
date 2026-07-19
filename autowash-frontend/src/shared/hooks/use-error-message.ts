"use client";

import { useTranslations } from "next-intl";
import {
  getApiErrorCode,
  getApiErrorFallbackMessage,
  getFirstFieldErrorMessage
} from "@/shared/lib/api-errors";

export function useErrorMessage() {
  const t = useTranslations("errors");

  return (error: unknown) => {
    const fieldErrorMessage = getFirstFieldErrorMessage(error);
    if (fieldErrorMessage) return fieldErrorMessage;

    const errorCode = getApiErrorCode(error);
    if (errorCode && t.has(errorCode)) return t(errorCode);

    return getApiErrorFallbackMessage(error) ?? t("UNEXPECTED");
  };
}

