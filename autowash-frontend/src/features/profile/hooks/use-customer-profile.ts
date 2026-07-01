"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyProfileToAuthUser, isAuthUserInSyncWithProfile } from "@/features/auth/lib/auth-session";
import {
  createCustomerAvatarUploadUrl,
  getCustomerProfile,
  updateCustomerAvatar,
  updateCustomerProfile,
  uploadAvatarFile,
} from "@/features/profile/lib/profile-service";
import { setAuthUser, useAuthStore } from "@/features/auth/store/auth.store";
import { customerProfileQueryKey } from "@/features/profile/hooks/customer-profile-query";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  CreateAvatarUploadUrlRequest,
  UpdateUserProfileRequest,
  UpdateUserProfileResponse,
  UpdateUserAvatarResponse,
  UserProfile,
} from "@/entities/users";

type UploadCustomerAvatarRequest = {
  file: File;
  contentType: CreateAvatarUploadUrlRequest["contentType"];
};

function syncCustomerProfileCache(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | null,
  updater: (current: UserProfile) => UserProfile,
) {
  queryClient.setQueryData<UserProfile | undefined>(
    customerProfileQueryKey(userId),
    (current) => (current ? updater(current) : undefined),
  );
}

export function useCustomerProfile() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;

  const query = useQuery<UserProfile, ApiErrorResponse>({
    queryKey: customerProfileQueryKey(userId),
    queryFn: getCustomerProfile,
    enabled: Boolean(accessToken && userId && user?.role === "CUSTOMER"),
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

export function useUpdateCustomerProfile() {
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
      syncCustomerProfileCache(queryClient, userId, (current) => ({
        ...current,
        fullName: response.fullName,
        phone: response.phone,
        email: response.email,
      }));

      if (user) {
        setAuthUser({
          ...user,
          fullName: response.fullName,
          phone: response.phone ?? "",
          email: response.email,
        });
      }

      void queryClient.invalidateQueries({ queryKey: customerProfileQueryKey(userId) });
    },
  });
}

export function useUploadCustomerAvatar() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;

  return useMutation<UpdateUserAvatarResponse, ApiErrorResponse, UploadCustomerAvatarRequest>({
    mutationFn: async ({ file, contentType }) => {
      const uploadTarget = await createCustomerAvatarUploadUrl({
        fileName: file.name,
        contentType,
      });
      await uploadAvatarFile(uploadTarget.uploadUrl, file, contentType);
      return updateCustomerAvatar({ objectKey: uploadTarget.objectKey });
    },
    onSuccess: (response) => {
      syncCustomerProfileCache(queryClient, userId, (current) => ({
        ...current,
        avatarUrl: response.avatarUrl,
      }));

      if (user) {
        setAuthUser({
          ...user,
          avatarUrl: response.avatarUrl,
        });
      }

      void queryClient.invalidateQueries({ queryKey: customerProfileQueryKey(userId) });
    },
  });
}
