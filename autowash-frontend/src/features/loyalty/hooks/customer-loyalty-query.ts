export function customerLoyaltyScope(userId?: string | null) {
  return ["customer-loyalty", userId ?? "anonymous"] as const;
}

export function loyaltyAccountQueryKey(userId?: string | null) {
  return [...customerLoyaltyScope(userId), "account"] as const;
}

export function loyaltyTransactionsQueryKey(userId?: string | null, page = 1, limit = 20) {
  return [...customerLoyaltyScope(userId), "transactions", page, limit] as const;
}

export function bookingPointBreakdownQueryKey(userId: string | null | undefined, bookingId: string) {
  return [...customerLoyaltyScope(userId), "booking-points", bookingId] as const;
}

export function washHistoryQueryKey(userId?: string | null, page = 1, limit = 20) {
  return [...customerLoyaltyScope(userId), "wash-history", page, limit] as const;
}

