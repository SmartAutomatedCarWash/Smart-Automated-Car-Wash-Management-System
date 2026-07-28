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
    const fallbackMessage = getApiErrorFallbackMessage(error);
    if (errorCode === "ACCOUNT_NOT_FOUND" || errorCode === "INCORRECT_PASSWORD") {
      return t("INVALID_LOGIN_CREDENTIALS");
    }
    if (errorCode === "BUSINESS_RULE_VIOLATION" && fallbackMessage) return fallbackMessage;
    if (errorCode && t.has(errorCode)) return t(errorCode);

    return fallbackMessage ?? t("UNEXPECTED");
  };
}

