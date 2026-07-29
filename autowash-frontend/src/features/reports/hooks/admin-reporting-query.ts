export function adminReportingScope(userId?: string | null) {
  return ["admin-reporting", userId ?? "anonymous"] as const;
}

export function adminBookingsQueryKey(userId?: string | null, filters?: unknown, page = 1, limit = 20) {
  return [...adminReportingScope(userId), "bookings", filters ?? {}, page, limit] as const;
}

export function adminAccountsQueryKey(userId?: string | null, filters?: unknown, page = 1, limit = 20) {
  return [...adminReportingScope(userId), "accounts", filters ?? {}, page, limit] as const;
}

export function adminAccountsSummaryQueryKey(userId?: string | null) {
  return [...adminReportingScope(userId), "accounts-summary"] as const;
}

export function adminCustomerDetailQueryKey(userId?: string | null, customerId?: string) {
  return [...adminReportingScope(userId), "customer-detail", customerId ?? ""] as const;
}

export function adminCustomerWashHistoryQueryKey(
  userId?: string | null,
  customerId?: string,
  params?: unknown,
) {
  return [...adminReportingScope(userId), "customer-wash-history", customerId ?? "", params ?? {}] as const;
}

export function adminCustomerVehiclesQueryKey(
  userId?: string | null,
  customerId?: string,
  params?: unknown,
) {
  return [...adminReportingScope(userId), "customer-vehicles", customerId ?? "", params ?? {}] as const;
}

export function adminCustomerTierHistoryQueryKey(
  userId?: string | null,
  customerId?: string,
  params?: unknown,
) {
  return [...adminReportingScope(userId), "customer-tier-history", customerId ?? "", params ?? {}] as const;
}

export function adminCustomerPointTransactionsQueryKey(
  userId?: string | null,
  customerId?: string,
  params?: unknown,
) {
  return [...adminReportingScope(userId), "customer-point-transactions", customerId ?? "", params ?? {}] as const;
}
