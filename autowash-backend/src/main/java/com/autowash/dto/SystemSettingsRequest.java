package com.autowash.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record SystemSettingsRequest(
        @NotBlank(message = "Operating start time is required")
        @Pattern(regexp = "^\\d{2}:\\d{2}$", message = "Must be HH:mm format")
        String operatingStartTime,

        @NotBlank(message = "Operating end time is required")
        @Pattern(regexp = "^\\d{2}:\\d{2}$", message = "Must be HH:mm format")
        String operatingEndTime,

        @NotNull @Min(value = 1, message = "Must be at least 1 day")
        Integer maxAdvanceBookingDays,

        @NotNull @Min(value = 0, message = "Cannot be negative")
        Integer noShowGraceMinutes,

        @NotNull @Min(value = 1, message = "Must be at least 1 booking")
        Integer maxBookingsPerTimeSlot,

        @NotBlank(message = "Currency is required")
        String currency,

        @NotNull @Min(value = 1, message = "Must be at least 1")
        Integer earnPointsUnitAmount,

        @Min(1)
        @Max(365)
        Integer redemptionVoucherExpirationDays
) {
}
