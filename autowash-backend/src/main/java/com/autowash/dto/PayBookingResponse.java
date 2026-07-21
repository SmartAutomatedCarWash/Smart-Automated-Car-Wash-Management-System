package com.autowash.dto;

import java.time.Instant;
import java.util.List;

public record PayBookingResponse(
        String bookingId,
        String paymentId,
        String paymentMethod,
        String paymentStatus,
        long amount,
        String transactionRef,
        Instant paidAt,
        String bookingStatus,
        String assignedStaffId,
        String assignedStaffName,
        List<BookingDetailResponse.StaffAssignment> assignedStaff
) {
}
