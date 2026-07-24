package com.autowash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.hibernate.validator.constraints.Length;

public record AdjustTotalEarnedPointsRequest(
        @NotNull(message = "Points delta must be provided")
        @Positive(message = "Points delta must be greater than 0")
        Integer pointsDelta,

        @NotBlank(message = "Reason is required")
        @Length(max = 255, message = "Reason is too long")
        String reason
) {
}
