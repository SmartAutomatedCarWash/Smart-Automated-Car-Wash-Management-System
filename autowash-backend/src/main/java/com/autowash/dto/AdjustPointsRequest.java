package com.autowash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.validator.constraints.Length;

public record AdjustPointsRequest(
        @NotNull(message = "Points must be provided")
        Integer points,
        
        @NotBlank(message = "Reason is required")
        @Length(max = 255, message = "Reason is too long")
        String reason
) {}
