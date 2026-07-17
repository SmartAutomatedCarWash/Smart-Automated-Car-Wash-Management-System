"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AuthApiError } from "@/shared/lib/api-errors";
import {
  buildAuthSession,
  getAuthRedirectPath,
} from "@/features/auth/lib/auth-session";
import {
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  requestForgotPassword,
  resetForgotPassword,
  sendCustomerOtp,
  verifyForgotPasswordOtp,
  verifyCustomerOtp,
} from "@/features/auth/lib/auth-service";
import { clearAuthSession, getRefreshToken, setAuthSession } from "@/features/auth/store/auth.store";
import {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponseData,
  RegisterRequest,
  RegisterResponseData,
  ResetPasswordRequest,
  SendOtpRequest,
  SendOtpResponseData,
  VerifyForgotPasswordOtpRequest,
  VerifyOtpRequest,
  VerifyOtpResponseData,
} from "@/entities/auth";

export function useCustomerLogin() {
  const router = useRouter();

  return useMutation<LoginResponseData, AuthApiError, LoginRequest>({
    mutationFn: loginCustomer,
    onSuccess: (data) => {
      setAuthSession(buildAuthSession(data));
      router.push(getAuthRedirectPath(data.role));
    },
    onError: (error) => {
      if (error.isInvalidSession()) {
        clearAuthSession();
      }
    }
  });
}

export function useCustomerRegister() {
  return useMutation<RegisterResponseData, AuthApiError, RegisterRequest>({
    mutationFn: registerCustomer,
  });
}

export function useSendCustomerOtp() {
  return useMutation<SendOtpResponseData, AuthApiError, SendOtpRequest>({
    mutationFn: sendCustomerOtp,
  });
}

export function useVerifyCustomerOtp() {
  const router = useRouter();

  return useMutation<VerifyOtpResponseData, AuthApiError, VerifyOtpRequest>({
    mutationFn: verifyCustomerOtp,
    onSuccess: (data) => {
      setAuthSession(buildAuthSession(data));
      router.push(getAuthRedirectPath(data.role));
    },
    onError: (error) => {
      if (error.isInvalidSession()) {
        clearAuthSession();
      }
    }
  });
}

export function useForgotPasswordRequest() {
  return useMutation<SendOtpResponseData, AuthApiError, ForgotPasswordRequest>({
    mutationFn: requestForgotPassword,
  });
}

export function useVerifyForgotPasswordOtp() {
  return useMutation<void, AuthApiError, VerifyForgotPasswordOtpRequest>({
    mutationFn: verifyForgotPasswordOtp,
  });
}

export function useForgotPasswordReset() {
  return useMutation<void, AuthApiError, ResetPasswordRequest>({
    mutationFn: resetForgotPassword,
  });
}

export function useCustomerLogout() {
  const router = useRouter();

  return useMutation<void, AuthApiError, void>({
    mutationFn: async () => {
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        await logoutCustomer({ refreshToken });
      }
    },
    onSettled: () => {
      clearAuthSession();
      router.push("/login");
    }
  });
}
