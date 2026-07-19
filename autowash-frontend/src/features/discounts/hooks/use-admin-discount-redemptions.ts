"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { PaginationMeta } from "@/entities/reports";
import type { ApiErrorResponse } from "@/shared/types/api.types";

export type AdminDiscountRedemption = {
  transactionId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  discountCode: string;
  pointsRedeemed: number;
  balanceAfter: number;
  redeemedAt: string;
};

export type AdminDiscountRedemptionPage = {
  items: AdminDiscountRedemption[];
  pagination: PaginationMeta;
};

function emptyPage(page: number, limit: number): AdminDiscountRedemptionPage {
  return {
    items: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 0,
      hasMore: false,
    },
  };
}

export function useAdminDiscountRedemptions(page = 1, limit = 20, searchQuery?: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;
  const enabled = Boolean(accessToken && userId && user?.role === "ADMIN");

  return useQuery<AdminDiscountRedemptionPage, ApiErrorResponse>({
    queryKey: ["admin-discounts", userId, "redemptions", page, limit, searchQuery ?? ""],
    queryFn: async () => emptyPage(page, limit),
    enabled,
  });
}
