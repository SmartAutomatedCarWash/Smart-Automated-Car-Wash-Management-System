import { getApiFieldErrors } from "@/shared/lib/api-errors";
import type { ApiErrorResponse } from "@/shared/types/api.types";

export const VEHICLE_TOAST_OPTIONS = { position: "bottom-right" as const };

export function getVehicleToastErrorMessage(
  error: unknown,
  fallback: string,
  getErrorMessage: (error: ApiErrorResponse) => string,
) {
  const fieldMessages = getApiFieldErrors(error)
    .map((item) => item.message?.trim())
    .filter(Boolean);

  if (fieldMessages.length > 0) {
    return fieldMessages.join(" ");
  }

  if (isApiErrorLike(error)) {
    return getErrorMessage(error);
  }

  return fallback;
}

function isApiErrorLike(error: unknown): error is ApiErrorResponse {
  return Boolean(error && typeof error === "object" && "message" in error);
}
