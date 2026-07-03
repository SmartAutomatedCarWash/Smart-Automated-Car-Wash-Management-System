import { apiClient, apiRequest } from "@/shared/lib/api";
import type { ApiSuccessResponse } from "@/shared/types/api.types";

export type TierConfig = {
  tier: string;
  name: string;
  minPoints: number;
  pointMultiplier: number;
  priorityScore: number;
  rankOrder: number;
  systemTier: boolean;
  active: boolean;
  updatedAt: string;
};

export type TierConfigRequest = {
  name: string;
  minPoints: number;
  pointMultiplier: number;
  priorityScore: number;
  rankOrder: number;
  active: boolean;
};

export type TierConfigCreateRequest = TierConfigRequest & {
  code: string;
};

export async function getTierConfigs(): Promise<TierConfig[]> {
  return apiRequest<TierConfig[]>({
    url: "/admin/tiers",
    method: "GET",
  });
}

export async function updateTierConfig(
  tier: string,
  request: TierConfigRequest
): Promise<TierConfig> {
  return apiRequest<TierConfig>({
    url: `/admin/tiers/${tier}`,
    method: "PUT",
    data: request,
  });
}

export async function createTierConfig(request: TierConfigCreateRequest): Promise<TierConfig> {
  return apiRequest<TierConfig>({
    url: "/admin/tiers",
    method: "POST",
    data: request,
  });
}
