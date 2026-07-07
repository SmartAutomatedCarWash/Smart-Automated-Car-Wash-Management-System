package com.autowash.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MyVoucherResponse(
        String id,
        String code,
        String name,
        String description,
        String discountType,
        int discountValue,
        long minOrderAmount,
        Long maxDiscountAmount,
        Instant issuedAt,
        Instant expiredAt,
        String status,
        List<String> targetTiers,
        List<UUID> applicableServiceIds
) {
}
