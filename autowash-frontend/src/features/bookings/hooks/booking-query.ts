import type { BookingListFilters } from "@/entities/bookings";

export function bookingQueryScope(userId?: string | null) {
  return ["customer-bookings", userId ?? "anonymous"] as const;
}

export function bookingsListQueryKey(userId?: string | null, filters: BookingListFilters = {}) {
  return [
    ...bookingQueryScope(userId),
    "list",
    filters.status ?? "ALL",
    filters.dateFrom ?? "ANY",
    filters.dateTo ?? "ANY",
    filters.page ?? 1,
    filters.limit ?? 20,
  ] as const;
}

export function bookingDetailQueryKey(userId?: string | null, bookingId?: string | null) {
  return [...bookingQueryScope(userId), "detail", bookingId ?? "unknown"] as const;
}

export function slotAvailabilityQueryKey(userId?: string | null, bookingDate?: string | null, times: string[] = []) {
  return [
    ...bookingQueryScope(userId),
    "slots",
    "availability",
    bookingDate ?? "",
    times.join(","),
  ] as const;
}

export function extraServiceRecommendationsQueryKey(userId?: string | null, comboId?: string | null) {
  return [
    ...bookingQueryScope(userId),
    "ai",
    "extra-service-recommendations",
    comboId ?? "",
  ] as const;
}

export function bookingStaffOptionsQueryKey(userId?: string | null, payloadKey = "") {
  return [
    ...bookingQueryScope(userId),
    "staff-options",
    payloadKey,
  ] as const;
}

export function washTrackingActiveQueryKey(userId?: string | null) {
  return [...bookingQueryScope(userId), "wash-tracking", "active"] as const;
}

export function washTrackingDetailQueryKey(userId?: string | null, washSessionId?: string | null) {
  return [...bookingQueryScope(userId), "wash-tracking", "detail", washSessionId ?? "unknown"] as const;
}

export function bookingVoucherQueryKey(
  userId?: string | null,
  discountCode?: string | null,
  amount = 0,
  packageId?: string | null,
) {
  return [
    ...bookingQueryScope(userId),
    "voucher",
    discountCode ?? "",
    amount,
    packageId ?? "",
  ] as const;
}
