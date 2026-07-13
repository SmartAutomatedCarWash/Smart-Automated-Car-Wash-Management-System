package com.autowash.controller;

import com.autowash.dto.DashboardMetricsDto;
import com.autowash.dto.AdminDashboardFullResponse;
import com.autowash.service.AdminDashboardMetricsService;
import com.autowash.service.AdminDashboardFullService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@Tag(name = "Admin Dashboard")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardMetricsController {

    private final AdminDashboardMetricsService metricsService;
    private final AdminDashboardFullService fullService;

    public AdminDashboardMetricsController(AdminDashboardMetricsService metricsService,
                                           AdminDashboardFullService fullService) {
        this.metricsService = metricsService;
        this.fullService = fullService;
    }

    @GetMapping("/metrics")
    @Operation(summary = "Get admin dashboard metrics", description = "Trả về các chỉ số vận hành tổng quan: tổng bookings, doanh thu, khách hàng, và số promotion đang active.")
    public ApiResponse<DashboardMetricsDto> getMetrics() {
        return ApiResponse.ok("Dashboard metrics retrieved", metricsService.getMetrics());
    }

    @GetMapping("/full")
    @Operation(summary = "Get full admin dashboard data", description = "Trả về toàn bộ dữ liệu dashboard: KPIs, charts, analytics, alerts, recent activities.")
    public ApiResponse<AdminDashboardFullResponse> getFullDashboard() {
        return ApiResponse.ok("Full dashboard retrieved", fullService.getDashboardFull());
    }
}
