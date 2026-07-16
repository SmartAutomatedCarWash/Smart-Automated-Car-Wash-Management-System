package com.autowash.dto;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record CancelWashSessionResponse(
        UUID sessionId,
        String status,
        String bookingId,
        String bookingStatus,
        String reason,
        String faultType,
        Instant cancelledAt
) {
}
