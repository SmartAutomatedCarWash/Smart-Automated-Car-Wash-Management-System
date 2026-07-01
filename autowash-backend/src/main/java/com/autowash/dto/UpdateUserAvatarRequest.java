package com.autowash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserAvatarRequest(
        @NotBlank(message = "Object key is required")
        @Size(max = 500, message = "Object key must be at most 500 characters")
        String objectKey
) {
}
