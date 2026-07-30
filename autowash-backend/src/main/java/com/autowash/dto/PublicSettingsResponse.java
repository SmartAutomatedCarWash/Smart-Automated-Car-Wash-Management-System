package com.autowash.dto;

public record PublicSettingsResponse(
        String operatingStartTime,
        String operatingEndTime,
        int maxBookingsPerTimeSlot,
        int maxAdvanceBookingDays
) {
}
