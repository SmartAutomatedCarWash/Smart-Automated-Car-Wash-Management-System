package com.autowash.dto;

import java.time.Instant;

public record DiscountValidationResponse(
        String discountCode,
        boolean isValid,
        String discountType,
        long discountValue,
        long discountAmount,
        long finalAmount,
        Instant expiresAt
) {
}
