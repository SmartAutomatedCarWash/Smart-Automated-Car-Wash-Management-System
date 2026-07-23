import { getAccessToken } from "@/features/auth/store/auth.store";
import type { LoyaltyAccount, LoyaltyTransaction, WashHistoryItem } from "@/entities/loyalty";

export function isCustomerDemo() {
  const token = getAccessToken();
  return token === "mock-token-customer";
}

export const DEMO_ACCOUNT = {
  customerId: "demo-customer-1",
  tier: "BRONZE",
  currentPoints: 1250,
  totalEarnedPoints: 3450,
  completedWashCount: 15,
  totalPaid: 4500000,
  updatedAt: new Date().toISOString(),
};

export const DEMO_TRANSACTIONS = {
  items: [
    {
      transactionId: "tx-1",
      sessionId: "session-1",
      bookingId: "booking-1",
      type: "EARN",
      points: 250,
      description: "Completed Ultimate Wash",
      createdAt: new Date().toISOString(),
    },
    {
      transactionId: "tx-2",
      sessionId: null,
      bookingId: null,
      type: "REDEEM",
      points: -500,
      description: "Redeemed 50K Voucher",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ] as LoyaltyTransaction[],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    hasMore: false,
  },
};

export const DEMO_WASH_HISTORY = {
  items: [] as WashHistoryItem[],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasMore: false,
  },
};
