package com.autowash.dto;

import java.time.Instant;

public record CustomerComboResponse(
        String customerComboId,
        String comboId,
        String comboName,
        String status,
        int totalUsages,
        int remainingUsages,
        String paymentStatus,
        String transactionRef,
        Instant activatedAt,
        Instant createdAt,
        Instant expiresAt,
        Instant lastUsedAt
) {
}
