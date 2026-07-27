package com.autowash.controller;

import com.autowash.dto.ManagerSettingAuditLogResponse;
import com.autowash.dto.ManagerSettingsResponse;
import com.autowash.dto.UpdateManagerSettingsRequest;
import com.autowash.dto.UpdateWeeklyStaffKpiTargetRequest;
import com.autowash.service.ManagerSettingsService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/manager/settings", "/api/v1/manager/settings/operations"})
@Tag(name = "Manager Settings")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
public class ManagerSettingsController {

    private final ManagerSettingsService managerSettingsService;

    public ManagerSettingsController(ManagerSettingsService managerSettingsService) {
        this.managerSettingsService = managerSettingsService;
    }

    @GetMapping
    public ApiResponse<ManagerSettingsResponse> getSettings() {
        return ApiResponse.ok("Manager operation settings retrieved", managerSettingsService.getSettings());
    }

    @PutMapping
    public ApiResponse<ManagerSettingsResponse> updateSettings(@Valid @RequestBody UpdateManagerSettingsRequest request) {
        return ApiResponse.ok("Manager operation settings updated", managerSettingsService.updateSettings(request));
    }

    @PutMapping("/weekly-staff-kpi-target")
    public ApiResponse<ManagerSettingsResponse> updateWeeklyStaffKpiTarget(@Valid @RequestBody UpdateWeeklyStaffKpiTargetRequest request) {
        return ApiResponse.ok("Manager weekly staff KPI target updated", managerSettingsService.updateWeeklyStaffKpiTarget(request));
    }

    @GetMapping("/audit-logs")
    public ApiResponse<List<ManagerSettingAuditLogResponse>> getAuditLogs() {
        return ApiResponse.ok("Manager operation audit logs retrieved", managerSettingsService.getAuditLogs());
    }
}
