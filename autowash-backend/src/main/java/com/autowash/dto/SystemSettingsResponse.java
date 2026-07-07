package com.autowash.dto;



public record SystemSettingsResponse(
        String operatingStartTime,
        String operatingEndTime,
        int maxAdvanceBookingDays,
        int noShowGraceMinutes,
        int maxBookingsPerTimeSlot,
        String currency,
        int earnPointsUnitAmount,
        int redemptionVoucherExpirationDays,
        String updatedAt
) {
}
