package com.autowash.controller;

import com.autowash.dto.PublicSettingsResponse;
import com.autowash.entity.SystemSettings;
import com.autowash.repository.SystemSettingsRepository;
import com.autowash.shared.dto.ApiResponse;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/settings")
@Tag(name = "Public Settings")
public class PublicSettingsController {

    private final SystemSettingsRepository systemSettingsRepository;

    public PublicSettingsController(SystemSettingsRepository systemSettingsRepository) {
        this.systemSettingsRepository = systemSettingsRepository;
    }

    @GetMapping("/public")
    @Operation(summary = "Get public booking settings (operating hours)")
    @Transactional(readOnly = true)
    public ApiResponse<PublicSettingsResponse> getPublicSettings() {
        SystemSettings settings = systemSettingsRepository.findById(1)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "System settings not found.",
                        ErrorCode.SYSTEM_ERROR
                ));
        return ApiResponse.ok("Public settings retrieved", new PublicSettingsResponse(
                settings.getOperatingStartTime(),
                settings.getOperatingEndTime(),
                settings.getMaxBookingsPerTimeSlot(),
                settings.getMaxAdvanceBookingDays()
        ));
    }
}
