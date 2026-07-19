package com.autowash.controller;

import com.autowash.dto.ManagerSettingAuditLogResponse;
import com.autowash.dto.ManagerSettingsResponse;
import com.autowash.dto.UpdateManagerSettingsRequest;
import com.autowash.service.ManagerSettingsService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/manager/settings")
@Tag(name = "Manager Settings")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
public class ManagerSettingsController {

    private final ManagerSettingsService managerSettingsService;

    public ManagerSettingsController(ManagerSettingsService managerSettingsService) {
        this.managerSettingsService = managerSettingsService;
    }

    @GetMapping
    @Operation(summary = "Get manager operation settings")
    public ApiResponse<ManagerSettingsResponse> getSettings() {
        return ApiResponse.ok("Manager settings retrieved", managerSettingsService.getSettings());
    }

    @PutMapping
    @Operation(summary = "Update manager operation settings")
    public ApiResponse<ManagerSettingsResponse> updateSettings(@Valid @RequestBody UpdateManagerSettingsRequest request) {
        return ApiResponse.ok("Manager settings updated", managerSettingsService.updateSettings(request));
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "Get manager settings audit logs")
    public ApiResponse<List<ManagerSettingAuditLogResponse>> getAuditLogs() {
        return ApiResponse.ok("Manager settings audit logs retrieved", managerSettingsService.getAuditLogs());
    }
}
