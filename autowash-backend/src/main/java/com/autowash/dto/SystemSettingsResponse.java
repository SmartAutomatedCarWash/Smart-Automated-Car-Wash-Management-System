package com.autowash.dto;



public record SystemSettingsResponse(
        String operatingStartTime,
        String operatingEndTime,
        int maxAdvanceBookingDays,
        int noShowGraceMinutes,
        int maxBookingsPerSlot,
        String currency,
        int earnPointsUnitAmount,
        int vndPerPoint,
        int minRedemptionPoints,
        int maxRedemptionPoints,
        String updatedAt
) {
}
