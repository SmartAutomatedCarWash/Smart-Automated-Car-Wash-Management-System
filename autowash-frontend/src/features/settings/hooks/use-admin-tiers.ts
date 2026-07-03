"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  createTierConfig,
  getTierConfigs,
  updateTierConfig,
  type TierConfig,
  type TierConfigCreateRequest,
  type TierConfigRequest,
} from "@/features/settings/lib/admin-tiers-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";

function useAdminTiersContext() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;
  const enabled = Boolean(accessToken && userId && user?.role === "ADMIN");
  return { userId, enabled };
}

function tiersScope(userId: string | null) {
  return ["admin-tiers", userId] as const;
}

export function useTierConfigs() {
  const { userId, enabled } = useAdminTiersContext();
  return useQuery<TierConfig[], ApiErrorResponse>({
    queryKey: [...tiersScope(userId)],
    queryFn: getTierConfigs,
    enabled,
  });
}

export function useUpdateTierConfig() {
  const queryClient = useQueryClient();
  const { userId } = useAdminTiersContext();

  return useMutation<
    TierConfig,
    ApiErrorResponse,
    { tier: string; request: TierConfigRequest }
  >({
    mutationFn: ({ tier, request }) => updateTierConfig(tier, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tiersScope(userId) });
    },
  });
}

export function useCreateTierConfig() {
  const queryClient = useQueryClient();
  const { userId } = useAdminTiersContext();

  return useMutation<TierConfig, ApiErrorResponse, TierConfigCreateRequest>({
    mutationFn: createTierConfig,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tiersScope(userId) });
    },
  });
}
