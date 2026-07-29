import { apiClient, apiRequest } from "@/shared/lib/api";
import { isCustomerDemo, DEMO_ACCOUNT, DEMO_TRANSACTIONS, DEMO_WASH_HISTORY } from "./customer-loyalty-demo";
import type { ApiPaginatedResponse } from "@/shared/types/api.types";
import type {
  LoyaltyAccount,
  RedeemPointsRequest,
  RedeemPointsResponse,
  LoyaltyTransaction,
  BookingPointBreakdown,
  TierVoucherOffer,
  WashHistoryItem,
} from "@/entities/loyalty";
import type { TierConfig } from "@/features/settings/lib/admin-tiers-service";

type TierVoucherOfferApiResponse = Omit<TierVoucherOffer, "discountValue"> & {
  discountValue?: number;
  voucherValue?: number;
};

export async function getCustomerLoyaltyAccount() {
  if (isCustomerDemo()) {
    return {
      ...DEMO_ACCOUNT,
      availablePoints: DEMO_ACCOUNT.currentPoints,
      lifetimePoints: DEMO_ACCOUNT.totalEarnedPoints,
    };
  }
  const account = await apiRequest<Omit<LoyaltyAccount, "availablePoints" | "lifetimePoints">>({
    method: "GET",
    url: "/loyalty/account",
  });

  return {
    ...account,
    availablePoints: account.currentPoints,
    lifetimePoints: account.totalEarnedPoints,
    totalBookingCount: account.totalBookingCount,
  };
}

export async function listCustomerLoyaltyTransactions(page = 1, limit = 20) {
  if (isCustomerDemo()) return DEMO_TRANSACTIONS;
  const response = await apiClient.get<ApiPaginatedResponse<LoyaltyTransaction>>("/loyalty/transactions", {
    params: { page, limit },
  });

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export function getCustomerBookingPointBreakdown(bookingId: string) {
  return apiRequest<BookingPointBreakdown>({
    method: "GET",
    url: `/loyalty/bookings/${encodeURIComponent(bookingId)}/points`,
  });
}

export function redeemCustomerLoyaltyPoints(payload: RedeemPointsRequest) {
  if (isCustomerDemo()) {
    return Promise.resolve({
      success: true,
      transactionId: "tx-demo",
      message: "Redeemed successfully (Demo)"
    } as unknown as RedeemPointsResponse);
  }
  return apiRequest<RedeemPointsResponse, RedeemPointsRequest>({
    method: "POST",
    url: "/loyalty/redeem",
    data: payload,
  });
}

export async function listCustomerWashHistory(page = 1, limit = 20) {
  if (isCustomerDemo()) return DEMO_WASH_HISTORY;
  const response = await apiClient.get<ApiPaginatedResponse<WashHistoryItem>>("/customers/wash-history", {
    params: { page, limit },
  });

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getPublicTierConfigs(): Promise<TierConfig[]> {
  if (isCustomerDemo()) return [];
  const response = await apiRequest<TierConfig[]>({
    url: "/tiers",
    method: "GET",
  });
  return response;
}

export async function listPublicTierVoucherOffers(): Promise<TierVoucherOffer[]> {
  if (isCustomerDemo()) return [];
  const response = await apiRequest<TierVoucherOfferApiResponse[]>({
    url: "/public/loyalty/offers",
    method: "GET",
  });
  return response.map((offer) => ({
    ...offer,
    discountValue: offer.discountValue ?? offer.voucherValue ?? 0,
  }));
}
