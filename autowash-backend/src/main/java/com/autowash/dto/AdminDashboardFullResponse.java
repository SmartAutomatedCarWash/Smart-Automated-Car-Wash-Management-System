package com.autowash.dto;

import java.util.List;
import java.util.Map;
import com.autowash.shared.dto.PaginationMeta;

/**
 * Full admin dashboard response — tổng hợp tất cả sections cho dashboard overview.
 */
public record AdminDashboardFullResponse(
        Kpis kpis,
        BookingTrend bookingTrend,
        BookingStatusDist bookingStatusDist,
        PeakHourData peakHours,
        RealTimeOps realTimeOps,
        LoyaltyTierDist loyaltyTierDist,
        VoucherStats voucherStats,
        TopServices topServices,
        CustomerInsights customerInsights,
        DashboardPage<NoShowAlert> noShowAlerts,
        DashboardPage<RecentBooking> recentBookings,
        DashboardPage<VoucherUsageItem> voucherUsageStats,
        DashboardPage<PointRedemptionItem> pointRedemptionHistory,
        ReviewSummary reviewSummary
) {
    public record DashboardPage<T>(
            List<T> items,
            PaginationMeta pagination
    ) {}

    /** Section 1 — 6 KPI cards */
    public record Kpis(
            long todayBookings,
            long todayBookingsDelta,
            long completedToday,
            long totalActiveCustomers,
            double noShowRate,
            long loyaltyMembers,
            double voucherRedemptionRate,
            long totalRevenue
    ) {}

    /** Section 2 — Booking trend area chart (last 7 days) */
    public record BookingTrend(List<TrendPoint> points) {
        public record TrendPoint(String label, long bookings) {}
    }

    /** Section 2 — Booking status doughnut */
    public record BookingStatusDist(
            long pending,
            long confirmed,
            long checkedIn,
            long inProgress,
            long completed,
            long cancelled,
            long noShow
    ) {}

    /** Section 3 — Peak hour bar chart (08–20) */
    public record PeakHourData(List<HourSlot> slots) {
        public record HourSlot(String hour, long bookings) {}
    }

    /** Section 3 — Real-time operations */
    public record RealTimeOps(
            long heldSlots,
            long waitingCars,
            long carsBeingWashed,
            long completedToday,
            long totalSessions
    ) {}

    /** Section 4 — Loyalty tier horizontal bar */
    public record LoyaltyTierDist(List<TierBucket> tiers) {
        public record TierBucket(String tier, String displayName, long count, double percentage) {}
    }

    /** Section 4 — Voucher donut */
    public record VoucherStats(
            long issued,
            long redeemed,
            long expired,
            long revoked
    ) {}

    /** Section 5 — Top services */
    public record TopServices(List<ServiceItem> items) {
        public record ServiceItem(String serviceId, String serviceName, long bookingCount, double percentage) {}
    }

    /** Section 5 — Customer insights */
    public record CustomerInsights(
            long newThisMonth,
            long returning,
            long vip,
            long inactive
    ) {}

    /** Section 6 — No-show alerts */
    public record NoShowAlert(
            String customerId,
            String customerName,
            String customerPhone,
            long violationCount,
            String tier
    ) {}

    /** Section 6 — Recent bookings */
    public record RecentBooking(
            String bookingId,
            String customerName,
            String serviceName,
            String scheduledAt,
            String status,
            String tier
    ) {}

    /** Voucher usage list, paginated from backend */
    public record VoucherUsageItem(
            String userDiscountId,
            String customerId,
            String customerName,
            String customerPhone,
            String discountCode,
            String voucherCode,
            String status,
            int pointsSpent,
            String claimedAt,
            String usedAt
    ) {}

    /** Point redemption history, paginated from backend */
    public record PointRedemptionItem(
            String transactionId,
            String customerId,
            String customerName,
            String customerPhone,
            String discountCode,
            int pointsRedeemed,
            int balanceAfter,
            String redeemedAt
    ) {}

    /** Review summary widget */
    public record ReviewSummary(
            double averageRating,
            long totalReviews,
            Map<Integer, Long> ratingDistribution,
            long positiveCount,
            double positiveRate,
            long featuredCount
    ) {}
}
