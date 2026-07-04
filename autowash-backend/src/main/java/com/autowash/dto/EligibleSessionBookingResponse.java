package com.autowash.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record EligibleSessionBookingResponse(
        String bookingId,
        String customerName,
        String customerPhone,
        String vehiclePlate,
        String packageId,
        String comboId,
        LocalDate bookingDate,
        LocalTime bookingTime,
        long finalAmount,
        int estimatedDurationMinutes,
        String assignedStaffId,
        String assignedStaffName,
        String customerTier,
        int customerPriorityScore
) {
}
