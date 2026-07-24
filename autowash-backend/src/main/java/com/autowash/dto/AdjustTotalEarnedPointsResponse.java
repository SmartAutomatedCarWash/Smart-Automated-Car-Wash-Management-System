package com.autowash.dto;

public record AdjustTotalEarnedPointsResponse(
        String customerId,
        int currentPoints,
        int totalEarnedPoints,
        String oldTier,
        String newTier,
        boolean tierChanged,
        String tierChangeDirection,
        String message
) {
}
