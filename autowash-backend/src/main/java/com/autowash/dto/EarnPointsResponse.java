package com.autowash.dto;

public record EarnPointsResponse(
        Long transactionId,
        int pointsAwarded,
        int newBalance,
        String tier,
        String oldTier,
        String newTier,
        boolean tierChanged,
        String tierChangeDirection,
        String message
) {
}
