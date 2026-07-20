"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AdminPromotionKind,
  createAdminPromotion,
  deleteAdminPromotion,
  getAdminPromotionById,
  listAdminPromotions,
  updateAdminPromotion,
} from "@/features/promotions/api/admin-promotions-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { adminPromotionsQueryKey, adminPromotionsQueryScope } from "@/features/promotions/hooks/admin-promotions-query";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { Promotion, PromotionListPage, PromotionRequest } from "@/entities/promotions";

function useAdminPromotionQueryContext() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;
  const enabled = Boolean(accessToken && userId && (user?.role === "ADMIN" || user?.role === "MANAGER"));

  return { userId, enabled };
}

export function useAdminPromotions(page = 1, limit = 20, kind: AdminPromotionKind = "PROMOTION") {
  const { userId, enabled } = useAdminPromotionQueryContext();

  return useQuery<PromotionListPage, ApiErrorResponse>({
    queryKey: adminPromotionsQueryKey(userId, page, limit, kind),
    queryFn: () => listAdminPromotions(page, limit, kind),
    enabled,
  });
}

export function useAdminPromotion(promotionId: string | null) {
  const { userId, enabled } = useAdminPromotionQueryContext();

  return useQuery<Promotion, ApiErrorResponse>({
    queryKey: [...adminPromotionsQueryScope(userId), "detail", promotionId],
    queryFn: () => getAdminPromotionById(promotionId!),
    enabled: enabled && Boolean(promotionId),
  });
}

export function useCreateAdminPromotion(kind: AdminPromotionKind = "PROMOTION") {
  const queryClient = useQueryClient();
  const { userId } = useAdminPromotionQueryContext();

  return useMutation<Promotion, ApiErrorResponse, PromotionRequest>({
    mutationFn: (payload) => createAdminPromotion(payload, kind),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminPromotionsQueryScope(userId, kind) });
    },
  });
}

export function useUpdateAdminPromotion(kind: AdminPromotionKind = "PROMOTION") {
  const queryClient = useQueryClient();
  const { userId } = useAdminPromotionQueryContext();

  return useMutation<
    Promotion,
    ApiErrorResponse,
    { promotionId: string; payload: PromotionRequest }
  >({
    mutationFn: ({ promotionId, payload }) => updateAdminPromotion(promotionId, payload, kind),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminPromotionsQueryScope(userId, kind) });
    },
  });
}

export function useDeleteAdminPromotion(kind: AdminPromotionKind = "PROMOTION") {
  const queryClient = useQueryClient();
  const { userId } = useAdminPromotionQueryContext();

  return useMutation<Promotion, ApiErrorResponse, string>({
    mutationFn: deleteAdminPromotion,
    onSuccess: (_data, deletedPromotionId) => {
      queryClient.setQueriesData<PromotionListPage>(
        { queryKey: adminPromotionsQueryScope(userId, kind) },
        (current) => {
          if (!current) {
            return current;
          }

          const items = current.items.filter((item) => item.promotionId !== deletedPromotionId);
          if (items.length === current.items.length) {
            return current;
          }

          return {
            ...current,
            items,
            pagination: {
              ...current.pagination,
              total: Math.max(0, current.pagination.total - 1),
            },
          };
        },
      );
    },
  });
}

