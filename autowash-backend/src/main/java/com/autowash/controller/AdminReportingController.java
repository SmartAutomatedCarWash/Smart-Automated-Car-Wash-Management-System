package com.autowash.controller;

import com.autowash.dto.AdminBusinessHealthReportResponse;
import com.autowash.dto.AdminOperationsDashboardResponse;
import com.autowash.service.AdminReportingService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin Reporting")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminReportingController {

    private final AdminReportingService adminReportingService;

    public AdminReportingController(AdminReportingService adminReportingService) {
        this.adminReportingService = adminReportingService;
    }

    @GetMapping("/reports/business-health")
    @Operation(summary = "Get executive business health report")
    public ApiResponse<AdminBusinessHealthReportResponse> getBusinessHealthReport(
            @RequestParam(defaultValue = "LAST_30_DAYS") String range,
            @RequestParam(defaultValue = "revenue") String analysisGroup,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo
    ) {
        return ApiResponse.ok(
                "Business health report retrieved",
                adminReportingService.getBusinessHealthReport(range, analysisGroup, dateFrom, dateTo)
        );
    }



    @GetMapping("/operations/dashboard")
    @Operation(summary = "Get admin operations dashboard")
    public ApiResponse<AdminOperationsDashboardResponse> getOperationsDashboard() {
        return ApiResponse.ok("Operations dashboard retrieved", adminReportingService.getOperationsDashboard());
    }


}
