package com.autowash.dto;


import java.time.Instant;
import java.util.List;

public record PromotionResponse(
        String promotionId,
        String name,
        String description,
        Double pointMultiplier,
        Instant startDate,
        Instant endDate,
        String targetingMode,
        List<String> applicableTiers,
        Integer maxUsagePerCustomer,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
}

