package com.autowash.controller;

import com.autowash.dto.OperationsQueueResponse;
import com.autowash.dto.StaffDashboardSummaryResponse;
import com.autowash.dto.StaffOptionResponse;
import com.autowash.dto.StaffSessionHistoryResponse;
import com.autowash.dto.StaffWorkloadResponse;
import com.autowash.dto.StaffTodayResponse;
import com.autowash.service.OperationsService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/operations")
@Tag(name = "Operations")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('STAFF', 'MANAGER', 'ADMIN')")
public class OperationsQueueController {

    private final OperationsService operationsService;

    public OperationsQueueController(OperationsService operationsService) {
        this.operationsService = operationsService;
    }

    @GetMapping("/queue")
    @Operation(summary = "Get staff operations queue")
    public ApiResponse<OperationsQueueResponse> getQueue() {
        return ApiResponse.ok("Operations queue retrieved", operationsService.getQueue());
    }

    @GetMapping("/staff/summary")
    @Operation(summary = "Get current staff personal dashboard summary")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<StaffDashboardSummaryResponse> getStaffSummary() {
        return ApiResponse.ok("Staff summary retrieved", operationsService.getStaffSummary());
    }

    @GetMapping("/staff/active")
    @Operation(summary = "List active staff members for assignment")
    public ApiResponse<List<StaffOptionResponse>> listActiveStaff() {
        return ApiResponse.ok("Active staff retrieved", operationsService.listActiveStaff());
    }

    @GetMapping("/staff/workload")
    @Operation(summary = "Get paginated staff workload")
    public ApiResponse<StaffWorkloadResponse> getStaffWorkloads(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "8") int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ApiResponse.ok("Staff workloads retrieved", operationsService.getStaffWorkloads(page, limit, date));
    }

    @GetMapping("/my-sessions/today")
    @Operation(summary = "Get today's sessions for the logged-in staff")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<StaffTodayResponse> getMySessionsToday(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ApiResponse.ok("Today sessions retrieved", operationsService.getMySessionsToday(date));
    }

    @GetMapping("/my-sessions/history")
    @Operation(summary = "Get completed session history for the logged-in staff")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<StaffSessionHistoryResponse> getMySessionHistory(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "ALL") String period,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String servicePackage,
            @RequestParam(defaultValue = "ALL") String rating,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "COMPLETED_DESC") String sort
    ) {
        return ApiResponse.ok(
                "Staff completed session history retrieved",
                operationsService.getMySessionHistory(page, limit, period, date, servicePackage, rating, search, sort)
        );
    }

    @GetMapping("/manager/sessions/history")
    @Operation(summary = "Get completed session history for manager operations")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ApiResponse<StaffSessionHistoryResponse> getManagerSessionHistory(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(defaultValue = "ALL") String period,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String servicePackage,
            @RequestParam(defaultValue = "ALL") String rating,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "COMPLETED_DESC") String sort,
            @RequestParam(required = false) UUID staffId
    ) {
        return ApiResponse.ok(
                "Manager completed session history retrieved",
                operationsService.getManagerSessionHistory(page, limit, period, date, servicePackage, rating, search, sort, staffId)
        );
    }

    @GetMapping("/admin/session-history")
    @Operation(summary = "Get completed session history for admin operations")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ApiResponse<StaffSessionHistoryResponse> getAdminSessionHistory(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "ALL") String period,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String servicePackage,
            @RequestParam(defaultValue = "ALL") String rating,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "COMPLETED_DESC") String sort,
            @RequestParam(required = false) UUID staffId
    ) {
        return ApiResponse.ok(
                "Admin completed session history retrieved",
                operationsService.getManagerSessionHistory(page, limit, period, date, servicePackage, rating, search, sort, staffId)
        );
    }
}
