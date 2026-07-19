"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyProfileToAuthUser, isAuthUserInSyncWithProfile } from "@/features/auth/lib/auth-session";
import { getCustomerProfile, updateCustomerProfile, changePassword } from "@/features/profile/lib/profile-service";
import { setAuthUser, useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  UpdateUserProfileRequest,
  UpdateUserProfileResponse,
  UserProfile,
} from "@/entities/users";
import type { ChangePasswordRequest } from "@/features/profile/lib/profile-service";

export function useStaffProfile() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;

  const query = useQuery<UserProfile, ApiErrorResponse>({
    queryKey: ["staff-profile", userId],
    queryFn: getCustomerProfile,
    enabled: Boolean(accessToken && userId && user?.role === "STAFF"),
  });

  useEffect(() => {
    if (!query.data || !user) {
      return;
    }

    if (isAuthUserInSyncWithProfile(user, query.data)) {
      return;
    }

    setAuthUser(applyProfileToAuthUser(user, query.data));
  }, [query.data, user]);

  return query;
}

export function useUpdateStaffProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;

  return useMutation<
    UpdateUserProfileResponse,
    ApiErrorResponse,
    UpdateUserProfileRequest
  >({
    mutationFn: updateCustomerProfile,
    onSuccess: (response) => {
      queryClient.setQueryData<UserProfile | undefined>(
        ["staff-profile", userId],
        (current) =>
          current
            ? {
                ...current,
                fullName: response.fullName,
                phone: response.phone,
                email: response.email,
              }
            : undefined,
      );

      if (user) {
        setAuthUser({
          ...user,
          fullName: response.fullName,
          phone: response.phone ?? "",
          email: response.email,
        });
      }

      void queryClient.invalidateQueries({ queryKey: ["staff-profile", userId] });
    },
  });
}

export function useChangeStaffPassword() {
  return useMutation<void, ApiErrorResponse, ChangePasswordRequest>({
    mutationFn: changePassword,
  });
}
