package com.autowash.dto;

import java.time.Instant;

public record HoldSlotResponse(
        Instant slotTime,
        Instant expiresAt
) {
}
