import { toAuthApiError } from "@/shared/lib/api-errors";
import { apiRequest } from "@/shared/lib/api";
import { ApiErrorResponse } from "@/shared/types/api.types";
import {
  ForgotPasswordRequest,
  GoogleAuthTicketResponse,
  LoginRequest,
  LoginResponseData,
  LogoutRequest,
  RegisterRequest,
  RegisterResponseData,
  ResetPasswordRequest,
  SendOtpRequest,
  SendOtpResponseData,
  VerifyForgotPasswordOtpRequest,
  VerifyOtpRequest,
  VerifyOtpResponseData,
} from "@/entities/auth";

export async function registerCustomer(payload: RegisterRequest) {
  try {
    return await apiRequest<RegisterResponseData, RegisterRequest>({
      method: "POST",
      url: "/auth/register",
      data: payload
    });
  } catch (error) {
    throw toAuthApiError(error as ApiErrorResponse);
  }
}

export async function loginCustomer(payload: LoginRequest) {
  // --- MOCK DEMO ACCOUNTS ---
  const demoAccounts: Record<string, any> = {
    "admin@demo.com": {
      userId: "admin-id-demo",
      fullName: "Admin Demo",
      phone: "0123456789",
      email: "admin@demo.com",
      role: "ADMIN",
      status: "ACTIVE",
      accessToken: "mock-token-admin",
      expiresIn: 3600 * 24
    },
    "staff@demo.com": {
      userId: "staff-id-demo",
      fullName: "Staff Demo",
      phone: "0123456788",
      email: "staff@demo.com",
      role: "STAFF",
      status: "ACTIVE",
      accessToken: "mock-token-staff",
      expiresIn: 3600 * 24
    },
    "manager@demo.com": {
      userId: "manager-id-demo",
      fullName: "Manager Demo",
      phone: "0123456786",
      email: "manager@demo.com",
      role: "MANAGER",
      status: "ACTIVE",
      accessToken: "mock-token-manager",
      expiresIn: 3600 * 24
    },
    "customer@demo.com": {
      userId: "customer-id-demo",
      fullName: "Customer Demo",
      phone: "0123456787",
      email: "customer@demo.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      accessToken: "mock-token-customer",
      expiresIn: 3600 * 24
    }
  };

  if (demoAccounts[payload.email]) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return demoAccounts[payload.email] as LoginResponseData;
  }
  // --- END MOCK ---

  try {
    return await apiRequest<LoginResponseData, LoginRequest>({
      method: "POST",
      url: "/auth/login",
      data: payload
    });
  } catch (error) {
    throw toAuthApiError(error as ApiErrorResponse);
  }
}

export async function sendCustomerOtp(payload: SendOtpRequest) {
  try {
    return await apiRequest<SendOtpResponseData, SendOtpRequest>({
      method: "POST",
      url: "/auth/otp/send",
      data: payload
    });
  } catch (error) {
    throw toAuthApiError(error as ApiErrorResponse);
  }
}

export async function verifyCustomerOtp(payload: VerifyOtpRequest) {
  try {
    return await apiRequest<VerifyOtpResponseData, VerifyOtpRequest>({
      method: "POST",
      url: "/auth/otp/verify",
      data: payload
    });
  } catch (error) {
    throw toAuthApiError(error as ApiErrorResponse);
  }
}

export async function requestForgotPassword(payload: ForgotPasswordRequest) {
  try {
    return await apiRequest<SendOtpResponseData, ForgotPasswordRequest>({
      method: "POST",
      url: "/auth/forgot-password/request",
      data: payload
    });
  } catch (error) {
    throw toAuthApiError(error as ApiErrorResponse);
  }
}

export async function verifyForgotPasswordOtp(payload: VerifyForgotPasswordOtpRequest) {
  try {
    await apiRequest<null, VerifyForgotPasswordOtpRequest>({
      method: "POST",
      url: "/auth/forgot-password/verify",
      data: payload
    });
  } catch (error) {
    throw toAuthApiError(error as ApiErrorResponse);
  }
}

export async function resetForgotPassword(payload: ResetPasswordRequest) {
  try {
    await apiRequest<null, ResetPasswordRequest>({
      method: "POST",
      url: "/auth/forgot-password/reset",
      data: payload
    });
  } catch (error) {
    throw toAuthApiError(error as ApiErrorResponse);
  }
}

export async function logoutCustomer(payload: LogoutRequest) {
  try {
    await apiRequest<null, LogoutRequest>({
      method: "POST",
      url: "/auth/logout",
      data: payload
    });
  } catch (error) {
    throw toAuthApiError(error as ApiErrorResponse);
  }
}

export async function getGoogleAuthTicket(state: string) {
  try {
    return await apiRequest<GoogleAuthTicketResponse>({
      method: "GET",
      url: `/auth/google/tickets/${state}`,
    });
  } catch (error) {
    throw toAuthApiError(error as ApiErrorResponse);
  }
}

export async function exchangeGoogleAuthTicket(state: string) {
  try {
    return await apiRequest<LoginResponseData, { state: string }>({
      method: "POST",
      url: "/auth/google/tickets/exchange",
      data: { state },
    });
  } catch (error) {
    throw toAuthApiError(error as ApiErrorResponse);
  }
}

export async function confirmGoogleAuthLink(state: string) {
  try {
    return await apiRequest<LoginResponseData, { state: string }>({
      method: "POST",
      url: "/auth/google/tickets/link",
      data: { state },
    });
  } catch (error) {
    throw toAuthApiError(error as ApiErrorResponse);
  }
}
