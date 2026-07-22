"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  listCustomerNotifications,
  markCustomerNotificationAsRead,
} from "@/features/notifications/lib/notifications-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { CustomerNotification } from "@/entities/notifications";

function useCustomerNotificationsContext() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;
  const isCustomer = user?.role === "CUSTOMER";

  return {
    userId,
    enabled: Boolean(accessToken && userId && isCustomer),
  };
}

function notificationsQueryKey(userId: string | null) {
  return ["customer-notifications", userId] as const;
}

export function useCustomerNotifications() {
  const { userId, enabled } = useCustomerNotificationsContext();

  return useQuery<CustomerNotification[], ApiErrorResponse>({
    queryKey: notificationsQueryKey(userId),
    queryFn: listCustomerNotifications,
    enabled,
    refetchInterval: 30_000,
  });
}

export function useMarkCustomerNotificationAsRead() {
  const queryClient = useQueryClient();
  const { userId } = useCustomerNotificationsContext();

  return useMutation<CustomerNotification, ApiErrorResponse, string>({
    mutationFn: markCustomerNotificationAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey(userId) });
    },
  });
}
