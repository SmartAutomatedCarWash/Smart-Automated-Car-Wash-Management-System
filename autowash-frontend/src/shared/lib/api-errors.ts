import { ApiErrorResponse, ApiFieldError } from "@/shared/types/api.types";

export class AuthApiError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly fieldErrors: ApiFieldError[];

  constructor(input: {
    message: string;
    statusCode: number;
    errorCode: string;
    fieldErrors?: ApiFieldError[];
  }) {
    super(input.message);
    this.name = "AuthApiError";
    this.statusCode = input.statusCode;
    this.errorCode = input.errorCode;
    this.fieldErrors = input.fieldErrors ?? [];
  }

  isExpiredSession() {
    return this.statusCode === 401 && this.errorCode === "TOKEN_EXPIRED";
  }

  isInvalidSession() {
    return this.statusCode === 401 && this.errorCode === "TOKEN_INVALID";
  }
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (error instanceof AuthApiError) {
    return error.errorCode;
  }

  if (isApiErrorResponse(error)) {
    return error.error?.code ?? error.errorCode;
  }

  if (error && typeof error === "object") {
    const errorLike = error as { errorCode?: unknown; error?: { code?: unknown } };
    if (typeof errorLike.error?.code === "string") return errorLike.error.code;
    if (typeof errorLike.errorCode === "string") return errorLike.errorCode;
  }

  return undefined;
}

export function getApiErrorFallbackMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (isApiErrorResponse(error)) {
    return error.error?.message ?? error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return undefined;
}

export function getApiFieldErrors(error: unknown): ApiFieldError[] {
  if (error instanceof AuthApiError) {
    return error.fieldErrors;
  }

  if (isApiErrorResponse(error)) {
    return error.errors ?? [];
  }

  if (error && typeof error === "object" && "fieldErrors" in error) {
    const fieldErrors = (error as { fieldErrors?: unknown }).fieldErrors;
    return Array.isArray(fieldErrors) ? (fieldErrors as ApiFieldError[]) : [];
  }

  return [];
}

export function getFirstFieldErrorMessage(error: unknown): string | undefined {
  const firstFieldError = getApiFieldErrors(error).find((item) => item.message?.trim());
  if (!firstFieldError) return undefined;

  return firstFieldError.field
    ? `${firstFieldError.field}: ${firstFieldError.message}`
    : firstFieldError.message;
}

export function toAuthApiError(error: ApiErrorResponse): AuthApiError {
  return new AuthApiError({
    message: error.error?.message ?? error.message,
    statusCode: error.statusCode,
    errorCode: getApiErrorCode(error) ?? "UNKNOWN_ERROR",
    fieldErrors: error.errors
  });
}

export function getFieldErrorMessage(
  fieldErrors: ApiFieldError[] | undefined,
  fieldName: string
) {
  return fieldErrors?.find((item) => item.field === fieldName)?.message ?? null;
}

export function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  return Boolean(
    error &&
      typeof error === "object" &&
      "success" in error &&
      (error as { success?: unknown }).success === false &&
      "statusCode" in error &&
      "message" in error &&
      "errorCode" in error
  );
}
