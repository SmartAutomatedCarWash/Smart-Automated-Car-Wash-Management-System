package com.autowash.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;


public record TierConfigRequest(
        @Size(max = 100)
        String name,

        @Min(value = 0, message = "Minimum points cannot be negative")
        Integer minPoints,

        @DecimalMin(value = "1.0", message = "Point multiplier must be at least 1.0")
        Double pointMultiplier,

        @Min(value = 0, message = "Priority score cannot be negative")
        Integer priorityScore,

        @Min(value = 0, message = "Rank order cannot be negative")
        Integer rankOrder,

        @Size(max = 500)
        String imageUrl,

        Boolean active
) {
}
