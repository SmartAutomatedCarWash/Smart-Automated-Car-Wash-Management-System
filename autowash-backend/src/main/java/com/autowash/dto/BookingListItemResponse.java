package com.autowash.dto;

import java.time.Instant;
import java.time.LocalDate;

public record BookingListItemResponse(
        String bookingId,
        String vehiclePlate,
        String primaryItemName,
        LocalDate bookingDate,
        String bookingTime,
        long finalAmount,
        String status,
        String washStatus,
        String assignedStaffName,
        Instant createdAt,
        Instant confirmationExpiresAt,
        Instant completedAt
) {
}
