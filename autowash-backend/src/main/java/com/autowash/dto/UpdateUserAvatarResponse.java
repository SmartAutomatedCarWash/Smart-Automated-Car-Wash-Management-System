package com.autowash.dto;

import java.time.Instant;

public record UpdateUserAvatarResponse(
        String userId,
        String avatarUrl,
        Instant updatedAt
) {
}
