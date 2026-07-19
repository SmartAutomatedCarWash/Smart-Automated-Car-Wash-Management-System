package com.autowash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ManagerNotificationTemplatePayload(
        @NotBlank @Size(max = 50) String templateKey,
        @NotBlank @Size(max = 100) String displayName,
        @NotBlank @Size(max = 255) String description,
        @NotBlank String message,
        @NotBlank String preview
) {
}
