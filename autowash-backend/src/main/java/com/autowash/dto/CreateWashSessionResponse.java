package com.autowash.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record CreateWashSessionResponse(
        UUID sessionId,
        String status,
        String bookingId,
        UUID assignedStaffId,
        String assignedStaffName,
        List<BookingDetailResponse.StaffAssignment> assignedStaff,
        Instant createdAt
) {
}
