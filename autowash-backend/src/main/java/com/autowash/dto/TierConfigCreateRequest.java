package com.autowash.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TierConfigCreateRequest(
        @NotBlank(message = "Tier code is required")
        @Size(max = 50)
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Tier code can only contain letters, numbers, underscores, and hyphens")
        String code,

        @NotBlank(message = "Tier name is required")
        @Size(max = 100)
        String name,

        @Min(value = 0, message = "Minimum points cannot be negative")
        int minPoints,

        @DecimalMin(value = "1.0", message = "Point multiplier must be at least 1.0")
        double pointMultiplier,

        @Min(value = 0, message = "Priority score cannot be negative")
        int priorityScore,

        @Min(value = 0, message = "Rank order cannot be negative")
        int rankOrder,

        @Min(value = 1, message = "Advance booking days must be at least 1")
        Integer advanceBookingDays,

        @Size(max = 500)
        String imageUrl,

        Boolean active
) {
}
