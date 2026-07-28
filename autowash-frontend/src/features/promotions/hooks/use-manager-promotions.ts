"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AdminPromotionKind as ManagerPromotionKind,
  createAdminPromotion as createManagerPromotion,
  deleteAdminPromotion as deleteManagerPromotion,
  getAdminPromotionById as getManagerPromotionById,
  listAdminPromotions as listManagerPromotions,
  updateAdminPromotion as updateManagerPromotion,
} from "@/features/promotions/api/manager-promotions-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { managerPromotionsQueryKey, managerPromotionsQueryScope } from "@/features/promotions/hooks/manager-promotions-query";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { Promotion, PromotionListPage, PromotionRequest } from "@/entities/promotions";

function useManagerPromotionQueryContext() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;
  const enabled = Boolean(accessToken && userId && (user?.role === "ADMIN" || user?.role === "MANAGER"));

  return { userId, enabled };
}

export function useManagerPromotions(page = 1, limit = 20, kind: ManagerPromotionKind = "PROMOTION") {
  const { userId, enabled } = useManagerPromotionQueryContext();

  return useQuery<PromotionListPage, ApiErrorResponse>({
    queryKey: managerPromotionsQueryKey(userId, page, limit, kind),
    queryFn: () => listManagerPromotions(page, limit, kind),
    enabled,
  });
}

export function useManagerPromotion(promotionId: string | null) {
  const { userId, enabled } = useManagerPromotionQueryContext();

  return useQuery<Promotion, ApiErrorResponse>({
    queryKey: [...managerPromotionsQueryScope(userId), "detail", promotionId],
    queryFn: () => getManagerPromotionById(promotionId!),
    enabled: enabled && Boolean(promotionId),
  });
}

export function useCreateManagerPromotion(kind: ManagerPromotionKind = "PROMOTION") {
  const queryClient = useQueryClient();
  const { userId } = useManagerPromotionQueryContext();

  return useMutation<Promotion, ApiErrorResponse, PromotionRequest>({
    mutationFn: (payload) => createManagerPromotion(payload, kind),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: managerPromotionsQueryScope(userId, kind) });
    },
  });
}

export function useUpdateManagerPromotion(kind: ManagerPromotionKind = "PROMOTION") {
  const queryClient = useQueryClient();
  const { userId } = useManagerPromotionQueryContext();

  return useMutation<
    Promotion,
    ApiErrorResponse,
    { promotionId: string; payload: PromotionRequest }
  >({
    mutationFn: ({ promotionId, payload }) => updateManagerPromotion(promotionId, payload, kind),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: managerPromotionsQueryScope(userId, kind) });
    },
  });
}

export function useDeleteManagerPromotion(kind: ManagerPromotionKind = "PROMOTION") {
  const queryClient = useQueryClient();
  const { userId } = useManagerPromotionQueryContext();

  return useMutation<Promotion, ApiErrorResponse, string>({
    mutationFn: deleteManagerPromotion,
    onSuccess: (_data, deletedPromotionId) => {
      queryClient.setQueriesData<PromotionListPage>(
        { queryKey: managerPromotionsQueryScope(userId, kind) },
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

