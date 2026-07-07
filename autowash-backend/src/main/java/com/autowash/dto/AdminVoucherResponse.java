package com.autowash.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminVoucherResponse(
        String code,
        String name,
        String description,
        String discountType,
        long discountValue,
        long minAmount,
        Long maxDiscountAmount,
        int requiredPoints,
        int validDaysAfterClaim,
        Instant expiresAt,
        boolean active,
        boolean newCustomerOnly,
        List<String> targetTiers,
        List<UUID> applicableServiceIds,
        Instant startAt,
        Instant endAt,
        String status,
        Integer usageLimit
) {
}
