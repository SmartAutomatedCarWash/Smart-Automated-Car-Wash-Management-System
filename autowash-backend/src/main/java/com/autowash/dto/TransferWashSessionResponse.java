package com.autowash.dto;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record TransferWashSessionResponse(
        UUID auditId,
        UUID sessionId,
        String bookingId,
        UUID fromStaffId,
        String fromStaffName,
        UUID toStaffId,
        String toStaffName,
        String reason,
        Instant transferredAt
) {
}
