"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  customerLoyaltyScope,
  customerPromotionsQueryKey,
  loyaltyAccountQueryKey,
  loyaltyTransactionsQueryKey,
  washHistoryQueryKey,
} from "@/features/loyalty/hooks/customer-loyalty-query";
import {
  getCustomerLoyaltyAccount,
  redeemCustomerLoyaltyPoints,
  listCustomerLoyaltyTransactions,
  listCustomerPromotions,
  listCustomerWashHistory,
  getPublicTierConfigs,
  listPublicTierVoucherOffers,
} from "@/features/loyalty/lib/customer-loyalty-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  CustomerPromotion,
  LoyaltyAccount,
  RedeemPointsRequest,
  RedeemPointsResponse,
  LoyaltyTransaction,
  WashHistoryItem,
} from "@/entities/loyalty";

type PaginatedData<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

function useCustomerLoyaltyContext() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;
  const enabled = Boolean(accessToken && userId && user?.role === "CUSTOMER");

  return { enabled, userId };
}

export function useCustomerLoyaltyAccount() {
  const { enabled, userId } = useCustomerLoyaltyContext();

  return useQuery<LoyaltyAccount, ApiErrorResponse>({
    queryKey: loyaltyAccountQueryKey(userId),
    queryFn: getCustomerLoyaltyAccount,
    enabled,
  });
}

export function useCustomerLoyaltyTransactions(page = 1, limit = 20) {
  const { enabled, userId } = useCustomerLoyaltyContext();

  return useQuery<PaginatedData<LoyaltyTransaction>, ApiErrorResponse>({
    queryKey: loyaltyTransactionsQueryKey(userId, page, limit),
    queryFn: () => listCustomerLoyaltyTransactions(page, limit),
    enabled,
  });
}

export function useCustomerWashHistory(page = 1, limit = 20) {
  const { enabled, userId } = useCustomerLoyaltyContext();

  return useQuery<PaginatedData<WashHistoryItem>, ApiErrorResponse>({
    queryKey: washHistoryQueryKey(userId, page, limit),
    queryFn: () => listCustomerWashHistory(page, limit),
    enabled,
  });
}

export function useCustomerPromotions() {
  const { enabled, userId } = useCustomerLoyaltyContext();

  return useQuery<CustomerPromotion[], ApiErrorResponse>({
    queryKey: customerPromotionsQueryKey(userId),
    queryFn: listCustomerPromotions,
    enabled,
  });
}

export function useCustomerRedeemPoints() {
  const { userId } = useCustomerLoyaltyContext();
  const queryClient = useQueryClient();

  return useMutation<RedeemPointsResponse, ApiErrorResponse, RedeemPointsRequest>({
    mutationFn: redeemCustomerLoyaltyPoints,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerLoyaltyScope(userId) });
    },
  });
}

export function usePublicTierConfigs() {
  return useQuery({
    queryKey: ["public-tier-configs"],
    queryFn: getPublicTierConfigs,
  });
}

export function usePublicTierVoucherOffers() {
  return useQuery({
    queryKey: ["public-tier-voucher-offers"],
    queryFn: listPublicTierVoucherOffers,
  });
}
