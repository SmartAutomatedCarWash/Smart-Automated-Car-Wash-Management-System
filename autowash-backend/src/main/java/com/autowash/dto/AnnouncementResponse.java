package com.autowash.dto;

import java.time.Instant;
import java.util.UUID;

public record AnnouncementResponse(
        UUID id,
        String title,
        String message,
        String linkUrl,
        String linkLabel,
        String type,
        boolean active,
        int priority,
        Instant expiresAt,
        Instant createdAt
) {}
