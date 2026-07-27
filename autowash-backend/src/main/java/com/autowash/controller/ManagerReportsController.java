package com.autowash.controller;

import com.autowash.dto.OperationsQueueResponse;
import com.autowash.service.ManagerSettingsService;
import com.autowash.service.OperationsService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/manager/reports")
@Tag(name = "Manager Reports")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
public class ManagerReportsController {

    private final OperationsService operationsService;
    private final ManagerSettingsService managerSettingsService;

    public ManagerReportsController(OperationsService operationsService, ManagerSettingsService managerSettingsService) {
        this.operationsService = operationsService;
        this.managerSettingsService = managerSettingsService;
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get manager report dashboard MVP data")
    public ApiResponse<DashboardResponse> getDashboard(
            @RequestParam(defaultValue = "MONTH") String rangeType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "false") boolean comparePrevious,
            @RequestParam(defaultValue = "ALL") String staffId,
            @RequestParam(defaultValue = "ALL") String serviceId
    ) {
        List<OperationsQueueResponse.WashSessionCard> sessions = operationsService.getQueue().columns().stream()
                .flatMap(column -> column.sessions().stream())
                .filter(session -> fromDate == null || !session.bookingDate().isBefore(fromDate))
                .filter(session -> toDate == null || !session.bookingDate().isAfter(toDate))
                .filter(session -> "ALL".equalsIgnoreCase(staffId) || (session.assignedStaffId() != null && session.assignedStaffId().toString().equals(staffId)))
                .filter(session -> "ALL".equalsIgnoreCase(serviceId) || serviceName(session).equalsIgnoreCase(serviceId))
                .toList();

        return ApiResponse.ok(
                "Manager report dashboard retrieved",
                new DashboardResponse(
                        buildSummary(sessions),
                        buildInsights(sessions),
                        buildFunnel(sessions),
                        buildTrend(sessions),
                        buildStaffKpis(sessions),
                        buildServiceQuality(sessions)
                )
        );
    }

    @GetMapping("/overview")
    public ApiResponse<SummaryResponse> getOverview() {
        return ApiResponse.ok("Manager report overview retrieved", buildSummary(allSessions()));
    }

    @GetMapping("/funnel")
    public ApiResponse<List<FunnelRowResponse>> getFunnel() {
        return ApiResponse.ok("Manager report funnel retrieved", buildFunnel(allSessions()));
    }

    @GetMapping("/trend")
    public ApiResponse<TrendResponse> getTrend() {
        return ApiResponse.ok("Manager report trend retrieved", buildTrend(allSessions()));
    }

    @GetMapping("/service-quality")
    public ApiResponse<ServiceQualityResponse> getServiceQuality() {
        return ApiResponse.ok("Manager service quality retrieved", buildServiceQuality(allSessions()));
    }

    @GetMapping("/export")
    public ApiResponse<ExportResponse> exportReport(@RequestParam(defaultValue = "xlsx") String format) {
        return ApiResponse.ok("Manager report export prepared", new ExportResponse(format, "Export endpoint stubbed for FE MVP."));
    }

    @PostMapping("/send")
    public ApiResponse<ExportResponse> sendReport(@RequestBody SendReportRequest request) {
        return ApiResponse.ok("Manager report sent", new ExportResponse("email", "Send report endpoint stubbed for FE MVP to " + request.email()));
    }

    private List<OperationsQueueResponse.WashSessionCard> allSessions() {
        return operationsService.getQueue().columns().stream().flatMap(column -> column.sessions().stream()).toList();
    }

    private SummaryResponse buildSummary(List<OperationsQueueResponse.WashSessionCard> sessions) {
        List<OperationsQueueResponse.WashSessionCard> completed = sessions.stream().filter(session -> "COMPLETED".equals(session.status())).toList();
        long revenue = completed.stream().mapToLong(session -> session.feeAmount() == null ? 0L : session.feeAmount()).sum();
        int total = sessions.size();
        int completedCount = completed.size();
        int completionRate = total == 0 ? 0 : Math.round(completedCount * 100f / total);
        long averageTicket = completedCount == 0 ? 0 : revenue / completedCount;
        return new SummaryResponse(revenue, completedCount, total, completionRate, 0, averageTicket, 0.0, 0);
    }

    private List<InsightResponse> buildInsights(List<OperationsQueueResponse.WashSessionCard> sessions) {
        int pending = (int) sessions.stream().filter(session -> !"COMPLETED".equals(session.status()) && !"CANCELLED".equals(session.status())).count();
        List<InsightResponse> insights = new ArrayList<>();
        insights.add(new InsightResponse("PENDING_BOOKINGS", pending > 0 ? "MEDIUM" : "INFO", "Booking ton", pending + " booking chua hoan thanh", "Kiem tra ngay"));
        insights.add(new InsightResponse("LOW_STAFF_KPI", "INFO", "Staff KPI", "Dang tinh tu du lieu operations", "Xem danh sach"));
        return insights;
    }

    private List<FunnelRowResponse> buildFunnel(List<OperationsQueueResponse.WashSessionCard> sessions) {
        int total = sessions.size();
        int checkedIn = (int) sessions.stream().filter(session -> List.of("CHECKED_IN", "IN_PROGRESS", "COMPLETED").contains(session.status())).count();
        int started = (int) sessions.stream().filter(session -> List.of("IN_PROGRESS", "COMPLETED").contains(session.status())).count();
        int completed = (int) sessions.stream().filter(session -> "COMPLETED".equals(session.status())).count();
        int cancelled = (int) sessions.stream().filter(session -> "CANCELLED".equals(session.status())).count();
        return List.of(
                funnel("BOOKED", "Booking trong ky", total, total),
                funnel("CHECKED_IN", "Da check-in", checkedIn, total),
                funnel("STARTED", "Da bat dau rua", started, total),
                funnel("COMPLETED", "Hoan thanh", completed, total),
                funnel("CANCELLED_OR_NO_SHOW", "Da huy / no-show", cancelled, total)
        );
    }

    private FunnelRowResponse funnel(String stage, String label, int count, int total) {
        return new FunnelRowResponse(stage, label, count, total == 0 ? 0 : Math.round(count * 100f / total));
    }

    private TrendResponse buildTrend(List<OperationsQueueResponse.WashSessionCard> sessions) {
        Map<LocalDate, List<OperationsQueueResponse.WashSessionCard>> byDate = sessions.stream().collect(Collectors.groupingBy(OperationsQueueResponse.WashSessionCard::bookingDate));
        List<TrendPointResponse> points = byDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new TrendPointResponse(
                        entry.getKey().toString(),
                        entry.getValue().stream().filter(session -> "COMPLETED".equals(session.status())).mapToLong(session -> session.feeAmount() == null ? 0L : session.feeAmount()).sum(),
                        entry.getValue().size(),
                        0,
                        0
                ))
                .toList();
        boolean hasRevenue = points.stream().anyMatch(point -> point.revenue() > 0);
        return new TrendResponse(hasRevenue, hasRevenue ? null : "Chua du doanh thu de hien thi xu huong.", points);
    }

    private List<StaffKpiResponse> buildStaffKpis(List<OperationsQueueResponse.WashSessionCard> sessions) {
        int weeklyTarget = managerSettingsService.getOperationSettings().weeklyStaffKpiTarget();
        return sessions.stream()
                .filter(session -> session.assignedStaffId() != null)
                .collect(Collectors.groupingBy(OperationsQueueResponse.WashSessionCard::assignedStaffId))
                .entrySet()
                .stream()
                .map(entry -> {
                    List<OperationsQueueResponse.WashSessionCard> staffSessions = entry.getValue();
                    long completed = staffSessions.stream().filter(session -> "COMPLETED".equals(session.status())).count();
                    long revenue = staffSessions.stream().filter(session -> "COMPLETED".equals(session.status())).mapToLong(session -> session.feeAmount() == null ? 0L : session.feeAmount()).sum();
                    int target = weeklyTarget;
                    return new StaffKpiResponse(entry.getKey().toString(), staffSessions.get(0).assignedStaffName(), completed, staffSessions.size(), target, Math.min(100, Math.round(completed * 100f / Math.max(1, target))), 4.8, revenue, completed >= target ? "ON_TRACK" : "NEEDS_SUPPORT");
                })
                .toList();
    }

    private ServiceQualityResponse buildServiceQuality(List<OperationsQueueResponse.WashSessionCard> sessions) {
        List<ServiceQualityItemResponse> services = sessions.stream()
                .collect(Collectors.groupingBy(this::serviceName))
                .entrySet()
                .stream()
                .map(entry -> new ServiceQualityItemResponse(
                        entry.getKey(),
                        entry.getKey(),
                        entry.getValue().size(),
                        entry.getValue().stream().filter(session -> "COMPLETED".equals(session.status())).mapToLong(session -> session.feeAmount() == null ? 0L : session.feeAmount()).sum(),
                        0.0
                ))
                .toList();
        return new ServiceQualityResponse(0.0, 0, 0, services);
    }

    private String serviceName(OperationsQueueResponse.WashSessionCard session) {
        if (session.servicePackage() != null && !session.servicePackage().isBlank()) return session.servicePackage();
        if (session.packageId() != null && !session.packageId().isBlank()) return session.packageId();
        return "Wash package";
    }

    public record DashboardResponse(SummaryResponse summary, List<InsightResponse> insights, List<FunnelRowResponse> funnel, TrendResponse trend, List<StaffKpiResponse> staffKpis, ServiceQualityResponse serviceQuality) {}
    public record SummaryResponse(long recordedRevenue, int completedBookings, int totalBookings, int completionRate, int completionRateChangePercent, long averageTicket, double averageRating, int reviewCount) {}
    public record InsightResponse(String type, String severity, String title, String value, String actionLabel) {}
    public record FunnelRowResponse(String stage, String label, int count, int rate) {}
    public record TrendResponse(boolean hasEnoughRevenueData, String emptyReason, List<TrendPointResponse> points) {}
    public record TrendPointResponse(String label, long revenue, int bookingCount, long previousRevenue, int previousBookingCount) {}
    public record StaffKpiResponse(String staffId, String fullName, long completedBookings, long assignedBookings, int kpiTarget, int kpiPercent, double rating, long revenue, String status) {}
    public record ServiceQualityResponse(double averageRating, int reviewCount, int pendingFeedbackCount, List<ServiceQualityItemResponse> services) {}
    public record ServiceQualityItemResponse(String serviceId, String serviceName, int bookingCount, long revenue, double averageRating) {}
    public record ExportResponse(String format, String message) {}
    public record SendReportRequest(String email, String format) {}
}
