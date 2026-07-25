package com.autowash.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record EligibleSessionBookingResponse(
        String bookingId,
        String status,
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
        List<BookingDetailResponse.StaffAssignment> assignedStaff,
        String customerTier,
        int customerPriorityScore
) {
}
