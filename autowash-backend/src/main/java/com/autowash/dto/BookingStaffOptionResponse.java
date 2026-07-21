package com.autowash.dto;

public record BookingStaffOptionResponse(
        String staffId,
        String staffName,
        String serviceName,
        boolean recommended,
        String reason,
        boolean available,
        String availabilityStatus
) {
}
