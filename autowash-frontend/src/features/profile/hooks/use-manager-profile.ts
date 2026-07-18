"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyProfileToAuthUser, isAuthUserInSyncWithProfile } from "@/features/auth/lib/auth-session";
import { getCustomerProfile, updateCustomerProfile } from "@/features/profile/lib/profile-service";
import {
  getDemoManagerProfile,
  isManagerDemoAccessToken,
  updateDemoManagerProfile,
} from "@/features/profile/lib/manager-profile-demo";
import { getAccessToken, setAuthUser, useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  UpdateUserProfileRequest,
  UpdateUserProfileResponse,
  UserProfile,
} from "@/entities/users";

export function useManagerProfile() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;

  const query = useQuery<UserProfile, ApiErrorResponse>({
    queryKey: ["manager-profile", userId],
    queryFn: () => (isManagerDemoAccessToken(getAccessToken()) ? getDemoManagerProfile() : getCustomerProfile()),
    enabled: Boolean(accessToken && userId && user?.role === "MANAGER"),
  });

  useEffect(() => {
    if (!query.data || !user) return;
    if (isAuthUserInSyncWithProfile(user, query.data)) return;
    setAuthUser(applyProfileToAuthUser(user, query.data));
  }, [query.data, user]);

  return query;
}

export function useUpdateManagerProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;

  return useMutation<UpdateUserProfileResponse, ApiErrorResponse, UpdateUserProfileRequest>({
    mutationFn: (payload) =>
      isManagerDemoAccessToken(getAccessToken()) ? updateDemoManagerProfile(payload) : updateCustomerProfile(payload),
    onSuccess: (response) => {
      queryClient.setQueryData<UserProfile | undefined>(["manager-profile", userId], (current) =>
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

      void queryClient.invalidateQueries({ queryKey: ["manager-profile", userId] });
    },
  });
}
