package com.autowash.controller;

import com.autowash.dto.StaffKpiItem;

import org.springframework.web.bind.annotation.RequestParam;

import com.autowash.dto.AdminAccountResponse;
import com.autowash.dto.AdminStaffWorkloadResponse;
import com.autowash.dto.CreateAdminStaffRequest;
import com.autowash.dto.UpdateAdminStaffRequest;
import com.autowash.dto.UpdateUserStatusRequest;
import com.autowash.service.AdminReportingService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/admin/staff")
@Tag(name = "Admin Staff")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class AdminStaffController {

    private final AdminReportingService adminReportingService;

    public AdminStaffController(AdminReportingService adminReportingService) {
        this.adminReportingService = adminReportingService;
    }

    @PostMapping
    @Operation(summary = "Create staff account")
    public ApiResponse<AdminAccountResponse> createStaff(@Valid @RequestBody CreateAdminStaffRequest request) {
        return ApiResponse.ok("Staff created", adminReportingService.createStaff(request));
    }

    @PutMapping("/{staffId}")
    @Operation(summary = "Update staff account")
    public ApiResponse<AdminAccountResponse> updateStaff(
            @PathVariable UUID staffId,
            @Valid @RequestBody UpdateAdminStaffRequest request
    ) {
        return ApiResponse.ok("Staff updated", adminReportingService.updateStaff(staffId, request));
    }

    @GetMapping
    @Operation(summary = "List staff accounts")
    public ApiResponse<AdminReportingService.AccountPage> listStaff(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int limit
    ) {
        return ApiResponse.ok("Staff retrieved", adminReportingService.listStaffPage(page, limit));
    }

    @PutMapping("/{staffId}/status")
    @Operation(summary = "Update staff status")
    public ApiResponse<AdminAccountResponse> updateStaffStatus(
            @PathVariable UUID staffId,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        return ApiResponse.ok("Staff status updated", adminReportingService.updateStaffStatus(staffId, request.status()));
    }

    @DeleteMapping("/{staffId}")
    @Operation(summary = "Delete staff account")
    public ApiResponse<AdminAccountResponse> deleteStaff(@PathVariable UUID staffId) {
        return ApiResponse.ok("Staff deleted", adminReportingService.deleteStaff(staffId));
    }

    @GetMapping("/{staffId}/workload")
    @Operation(summary = "Get staff workload")
    public ApiResponse<AdminStaffWorkloadResponse> getStaffWorkload(@PathVariable UUID staffId) {
        return ApiResponse.ok("Staff workload retrieved", adminReportingService.getStaffWorkload(staffId));
    }

    @GetMapping("/kpi")
    @Operation(summary = "List all staff KPI for admin dashboard")
    public ApiResponse<AdminReportingService.StaffKpiPage> listStaffKpi(
            @RequestParam(defaultValue = "TODAY") String range,
            @RequestParam(required = false) UUID staffId,
            @RequestParam(required = false) String serviceName,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int limit
    ) {
        return ApiResponse.ok("Staff KPI retrieved", adminReportingService.listStaffKpiPage(range, staffId, serviceName, dateFrom, dateTo, page, limit));
    }
}
