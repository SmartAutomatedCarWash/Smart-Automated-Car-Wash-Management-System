package com.autowash.dto;

import java.time.Instant;
import java.util.UUID;

public record LoyaltyAccountResponse(
        String customerId,
        String tier,
        int currentPoints,
        int totalEarnedPoints,
        int completedWashCount,
        long totalBookingCount,
        Instant updatedAt
) {

    public LoyaltyAccountResponse(String customerId, String tier, int currentPoints, int totalEarnedPoints, int completedWashCount) {
        this(customerId, tier, currentPoints, totalEarnedPoints, completedWashCount, 0, null);
    }

    public LoyaltyAccountResponse(UUID customerId, int currentPoints, String tier, Instant updatedAt) {
        this(customerId.toString(), tier, currentPoints, currentPoints, 0, 0, updatedAt);
    }
}
