import { apiClient } from "@/shared/lib/api";
import type { ApiSuccessResponse } from "@/shared/types/api.types";

export type DashboardMetrics = {
  totalBookings: number;
  totalRevenue: number;
  totalCustomers: number;
  activePromotions: number;
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
  noShowAlerts: NoShowAlert[];
  recentBookings: RecentBooking[];
  reviewSummary: ReviewSummary;
};

// ── Fetch functions ───────────────────────────────────────────────────────────

export async function fetchAdminDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await apiClient.get<ApiSuccessResponse<DashboardMetrics>>(
    "/admin/dashboard/metrics"
  );
  return response.data.data;
}

export async function fetchAdminDashboardFull(): Promise<AdminDashboardFull> {
  const response = await apiClient.get<ApiSuccessResponse<AdminDashboardFull>>(
    "/admin/dashboard/full"
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

export async function fetchStaffKpi(range: StaffKpiRange = "TODAY"): Promise<StaffKpiItem[]> {
  const response = await apiClient.get<ApiSuccessResponse<StaffKpiItem[]>>(
    "/admin/staff/kpi",
    { params: { range } }
  );
  return response.data.data;
}
