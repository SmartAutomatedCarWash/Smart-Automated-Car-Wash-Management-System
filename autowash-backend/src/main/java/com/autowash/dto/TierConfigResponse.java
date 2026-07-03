package com.autowash.dto;

import java.time.Instant;

public record TierConfigResponse(
        String tier,
        String name,
        int minPoints,
        double pointMultiplier,
        int priorityScore,
        int rankOrder,
        boolean systemTier,
        boolean active,
        Instant updatedAt
) {
}
