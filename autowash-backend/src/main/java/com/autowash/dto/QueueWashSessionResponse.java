package com.autowash.dto;

import java.util.UUID;
import java.time.Instant;
import lombok.Builder;

@Builder
public record QueueWashSessionResponse(
        UUID sessionId,
        String status,
        Instant queuedAt
) {
}
