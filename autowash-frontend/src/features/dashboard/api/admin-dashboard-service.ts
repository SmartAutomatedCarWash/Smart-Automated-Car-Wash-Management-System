import { apiClient } from "@/shared/lib/api";
import type { ApiSuccessResponse } from "@/shared/types/api.types";
import type { PaginationMeta } from "@/entities/reports";

export type DashboardMetrics = {
  totalBookings: number;
  totalRevenue: number;
  totalCustomers: number;
  activeDiscounts: number;
};

// ── Full dashboard types ──────────────────────────────────────────────────────

export type DashboardKpis = {
  todayBookings: number;
  todayBookingsDelta: number;
  completedToday: number;
  totalActiveCustomers: number;
  noShowRate: number;
  loyaltyMembers: number;
  voucherRedemptionRate: number;
  totalRevenue: number;
};

export type TrendPoint = { label: string; bookings: number };
export type BookingTrend = { points: TrendPoint[] };

export type BookingStatusDist = {
  pending: number;
  confirmed: number;
  checkedIn: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

export type HourSlot = { hour: string; bookings: number };
export type PeakHourData = { slots: HourSlot[] };

export type RealTimeOps = {
  heldSlots: number;
  waitingCars: number;
  carsBeingWashed: number;
  completedToday: number;
  totalSessions: number;
};

export type TierBucket = { tier: string; displayName: string; count: number; percentage: number };
export type LoyaltyTierDist = { tiers: TierBucket[] };

export type VoucherStats = { issued: number; redeemed: number; expired: number; revoked: number };
export type DashboardPage<T> = { items: T[]; pagination: PaginationMeta };

export type ServiceItem = { serviceId: string | null; serviceName: string; bookingCount: number; percentage: number };
export type TopServices = { items: ServiceItem[] };

export type CustomerInsights = { newThisMonth: number; returning: number; vip: number; inactive: number };

export type NoShowAlert = {
  customerId: string;
  customerName: string;
  customerPhone: string;
  violationCount: number;
  tier: string;
};

export type RecentBooking = {
  bookingId: string;
  customerName: string;
  serviceName: string;
  scheduledAt: string;
  status: string;
  tier: string;
};

export type VoucherUsageItem = {
  userDiscountId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  discountCode: string;
  voucherCode: string | null;
  status: string;
  pointsSpent: number;
  claimedAt: string;
  usedAt: string | null;
};

export type PointRedemptionItem = {
  transactionId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  discountCode: string;
  pointsRedeemed: number;
  balanceAfter: number;
  redeemedAt: string;
};

export type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  positiveCount: number;
  positiveRate: number;
  featuredCount: number;
};

export type AdminDashboardFull = {
  kpis: DashboardKpis;
  bookingTrend: BookingTrend;
  bookingStatusDist: BookingStatusDist;
  peakHours: PeakHourData;
  realTimeOps: RealTimeOps;
  loyaltyTierDist: LoyaltyTierDist;
  voucherStats: VoucherStats;
  topServices: TopServices;
  customerInsights: CustomerInsights;
  noShowAlerts: DashboardPage<NoShowAlert>;
  recentBookings: DashboardPage<RecentBooking>;
  voucherUsageStats: DashboardPage<VoucherUsageItem>;
  pointRedemptionHistory: DashboardPage<PointRedemptionItem>;
  reviewSummary: ReviewSummary;
};

export type AdminDashboardFullParams = {
  noShowPage?: number;
  recentBookingPage?: number;
  voucherUsagePage?: number;
  pointRedemptionPage?: number;
  limit?: number;
};

// ── Fetch functions ───────────────────────────────────────────────────────────

export async function fetchAdminDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await apiClient.get<ApiSuccessResponse<DashboardMetrics>>(
    "/admin/dashboard/metrics"
  );
  return response.data.data;
}

export async function fetchAdminDashboardFull(params?: AdminDashboardFullParams): Promise<AdminDashboardFull> {
  const response = await apiClient.get<ApiSuccessResponse<AdminDashboardFull>>(
    "/admin/dashboard/full",
    { params }
  );
  return response.data.data;
}

// ── Staff KPI types ───────────────────────────────────────────────────────────

export type StaffKpiRange = "TODAY" | "WEEK" | "MONTH";

export type StaffKpiItem = {
  staffId: string;
  staffName: string;
  status: string;
  completedBookings: number;
  completedRevenue: number;
  activeSessions: number;
  totalAssignedBookings: number;
  kpiProgressPercent: number;
  kpiTargetRevenue: number;
  isOnline: boolean;
};

export type StaffKpiPageResponse = {
  items: StaffKpiItem[];
  pagination: PaginationMeta;
};

function normalizeStaffKpi(data: StaffKpiItem[] | StaffKpiPageResponse | null | undefined): StaffKpiPageResponse {
  const fallbackPagination: PaginationMeta = { page: 1, limit: 5, total: 0, totalPages: 0, hasMore: false };
  if (Array.isArray(data)) return { items: data, pagination: { ...fallbackPagination, total: data.length, totalPages: data.length > 0 ? 1 : 0 } };
  if (Array.isArray(data?.items)) return data;
  return { items: [], pagination: fallbackPagination };
}

export async function fetchStaffKpi(range: StaffKpiRange = "TODAY", page = 1, limit = 5): Promise<StaffKpiPageResponse> {
  const response = await apiClient.get<ApiSuccessResponse<StaffKpiItem[] | StaffKpiPageResponse>>(
    "/admin/staff/kpi",
    { params: { range, page, limit } }
  );
  return normalizeStaffKpi(response.data.data);
}
