package com.autowash.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CustomerVoucherResponse(
        String id,
        String code,
        String name,
        String description,
        String discountType,
        int discountValue,
        long minOrderAmount,
        Long maxDiscountAmount,
        int requiredPoints,
        int validDaysAfterClaim,
        Instant endAt,
        List<String> targetTiers,
        List<UUID> applicableServiceIds
) {
}
