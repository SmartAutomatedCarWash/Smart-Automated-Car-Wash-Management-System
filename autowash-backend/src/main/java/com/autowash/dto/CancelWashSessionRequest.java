package com.autowash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelWashSessionRequest(
        @NotBlank(message = "Cancel reason is required")
        @Size(max = 500, message = "Cancel reason must be at most 500 characters")
        String reason,
        String faultType
) {
}
