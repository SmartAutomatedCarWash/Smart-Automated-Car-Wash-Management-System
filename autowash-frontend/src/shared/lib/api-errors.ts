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

export function getApiErrorCode(error: ApiErrorResponse) {
  return error.error?.code ?? error.errorCode;
}

export function toAuthApiError(error: ApiErrorResponse): AuthApiError {
  return new AuthApiError({
    message: error.error?.message ?? error.message,
    statusCode: error.statusCode,
    errorCode: getApiErrorCode(error),
    fieldErrors: error.errors
  });
}

export function getDisplayErrorMessage(error: unknown): string {
  if (error instanceof AuthApiError) {
    return error.message;
  }

  if (error && typeof error === "object" && "errors" in error) {
    const fieldErrors = (error as { errors?: unknown }).errors;
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      const first = fieldErrors[0] as { field?: unknown; message?: unknown };
      const field = typeof first.field === "string" ? first.field : null;
      const message = typeof first.message === "string" ? first.message : null;
      if (message) {
        return field ? `${field}: ${message}` : message;
      }
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return "Unexpected error";
}

export function getFieldErrorMessage(
  fieldErrors: ApiFieldError[] | undefined,
  fieldName: string
) {
  return fieldErrors?.find((item) => item.field === fieldName)?.message ?? null;
}
