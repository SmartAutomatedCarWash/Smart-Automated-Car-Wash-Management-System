import { apiClient, apiRequest } from "@/shared/lib/api";
import type { ApiPaginatedResponse } from "@/shared/types/api.types";
import type {
  LoyaltyAccount,
  RedeemPointsRequest,
  RedeemPointsResponse,
  LoyaltyTransaction,
  TierVoucherOffer,
  WashHistoryItem,
} from "@/entities/loyalty";
import type { TierConfig } from "@/features/settings/lib/admin-tiers-service";

export async function getCustomerLoyaltyAccount() {
  const account = await apiRequest<Omit<LoyaltyAccount, "availablePoints" | "lifetimePoints">>({
    method: "GET",
    url: "/loyalty/account",
  });

  return {
    ...account,
    availablePoints: account.currentPoints,
    lifetimePoints: account.totalEarnedPoints,
  };
}

export async function listCustomerLoyaltyTransactions(page = 1, limit = 20) {
  const response = await apiClient.get<ApiPaginatedResponse<LoyaltyTransaction>>("/loyalty/transactions", {
    params: { page, limit },
  });

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export function redeemCustomerLoyaltyPoints(payload: RedeemPointsRequest) {
  return apiRequest<RedeemPointsResponse, RedeemPointsRequest>({
    method: "POST",
    url: "/loyalty/redeem",
    data: payload,
  });
}

export async function listCustomerWashHistory(page = 1, limit = 20) {
  const response = await apiClient.get<ApiPaginatedResponse<WashHistoryItem>>("/customers/wash-history", {
    params: { page, limit },
  });

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getPublicTierConfigs(): Promise<TierConfig[]> {
  const response = await apiRequest<TierConfig[]>({
    url: "/tiers",
    method: "GET",
  });
  return response;
}

export async function listPublicTierVoucherOffers(): Promise<TierVoucherOffer[]> {
  const response = await apiRequest<TierVoucherOffer[]>({
    url: "/public/loyalty/offers",
    method: "GET",
  });
  return response;
}
