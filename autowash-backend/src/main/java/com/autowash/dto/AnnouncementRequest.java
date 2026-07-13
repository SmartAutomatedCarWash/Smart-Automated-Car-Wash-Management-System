package com.autowash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record AnnouncementRequest(
        @NotBlank @Size(max = 255) String title,
        String message,
        String linkUrl,
        String linkLabel,
        String type,
        boolean active,
        int priority,
        Instant expiresAt
) {}
