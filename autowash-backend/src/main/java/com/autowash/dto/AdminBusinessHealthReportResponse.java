package com.autowash.dto;

import java.util.List;
import lombok.Builder;

@Builder
public record AdminBusinessHealthReportResponse(
        Period period,
        Period previousPeriod,
        Kpis kpis,
        Trends trends,
        Breakdowns breakdowns,
        List<Insight> insights,
        TopItems topItems,
        Capabilities capabilities
) {
    @Builder
    public record Period(String key, String label, String dateFrom, String dateTo) {}

    @Builder
    public record Kpis(
            long revenueThisPeriod,
            long revenuePreviousPeriod,
            double revenueGrowthRate,
            long completedBookings,
            double completedBookingsGrowthRate,
            long averageBookingValue,
            double cancellationRate,
            long discountAssistedRevenue
    ) {}

    @Builder
    public record Trends(Series revenue, Series completedBookings) {}

    @Builder
    public record Series(List<Point> points, List<Point> previousPoints) {}

    @Builder
    public record Point(String label, long value) {}

    @Builder
    public record Breakdowns(
            Breakdown revenue,
            Breakdown service,
            Breakdown discount,
            Breakdown channel
    ) {}

    @Builder
    public record Breakdown(boolean available, List<BreakdownItem> items, String message) {}

    @Builder
    public record BreakdownItem(String key, String label, long revenue, long bookings, double share) {}

    @Builder
    public record Insight(String tone, String title, String summary) {}

    @Builder
    public record TopItems(List<BreakdownItem> services) {}

    @Builder
    public record Capabilities(boolean channelAvailable, boolean discountAttributionExact) {}
}
