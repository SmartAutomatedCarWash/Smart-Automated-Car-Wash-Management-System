package com.autowash.controller;

import com.autowash.dto.SystemSettingsRequest;
import com.autowash.dto.SystemSettingsResponse;
import com.autowash.entity.SystemSettings;
import com.autowash.repository.SystemSettingsRepository;
import com.autowash.shared.dto.ApiResponse;
import com.autowash.shared.exception.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/admin/settings")
@Tag(name = "Admin Settings")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSettingsController {

    private final SystemSettingsRepository systemSettingsRepository;

    public AdminSettingsController(SystemSettingsRepository systemSettingsRepository) {
        this.systemSettingsRepository = systemSettingsRepository;
    }

    @GetMapping
    @Operation(summary = "Get system settings")
    @Transactional(readOnly = true)
    public ApiResponse<SystemSettingsResponse> getSettings() {
        SystemSettings settings = loadSettings();
        return ApiResponse.ok("Settings retrieved", toResponse(settings));
    }

    @PutMapping
    @Operation(summary = "Update system settings")
    @Transactional
    public ApiResponse<SystemSettingsResponse> updateSettings(@Valid @RequestBody SystemSettingsRequest request) {
        SystemSettings settings = loadSettings();
        settings.update(
                request.operatingStartTime(),
                request.operatingEndTime(),
                request.maxAdvanceBookingDays(),
                request.noShowGraceMinutes(),
                request.maxBookingsPerTimeSlot(),
                request.currency(),
                request.earnPointsUnitAmount(),
                request.redemptionVoucherExpirationDays()
        );
        systemSettingsRepository.save(settings);
        return ApiResponse.ok("Settings updated", toResponse(settings));
    }

    private SystemSettings loadSettings() {
        return systemSettingsRepository.findById(1)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "System settings not found. Please check database migration.",
                        "SYSTEM_ERROR"
                ));
    }

    private SystemSettingsResponse toResponse(SystemSettings settings) {
        return new SystemSettingsResponse(
                settings.getOperatingStartTime(),
                settings.getOperatingEndTime(),
                settings.getMaxAdvanceBookingDays(),
                settings.getNoShowGraceMinutes(),
                settings.getMaxBookingsPerTimeSlot(),
                settings.getCurrency(),
                settings.getEarnPointsUnitAmount(),
                settings.getRedemptionVoucherExpirationDays(),
                settings.getUpdatedAt().toString()
        );
    }
}
