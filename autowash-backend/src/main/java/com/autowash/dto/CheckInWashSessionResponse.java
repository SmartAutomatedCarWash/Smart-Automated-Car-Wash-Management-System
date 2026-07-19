package com.autowash.dto;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record CheckInWashSessionResponse(
        UUID sessionId,
        String status,
        Instant checkedInAt,
        Fee fee,
        int projectedLoyaltyPoints
) {
    public record Fee(
            long amount,
            String currency
    ) {
    }
}
