package com.autowash.dto;


import java.time.Instant;
import java.util.List;

public record CustomerPromotionResponse(
        String promotionCode,
        String title,
        String promotionType,
        List<String> targetTiers,
        Double pointMultiplier,
        long minAmount,
        boolean newCustomerOnly,
        Instant expiresAt
) {
}

