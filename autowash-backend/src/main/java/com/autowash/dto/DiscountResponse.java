package com.autowash.dto;

import com.autowash.entity.enums.DiscountKind;
import com.autowash.entity.enums.DiscountTargetingMode;
import com.autowash.entity.enums.DiscountType;
import com.autowash.entity.enums.ActiveStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DiscountResponse(
        UUID id,
        DiscountKind type,
        String code,
        String name,
        String description,
        DiscountType discountType,
        long discountValue,
        long minOrderAmount,
        Long maxDiscountAmount,
        int requiredPoints,
        Integer validDaysAfterClaim,
        DiscountTargetingMode targetingMode,
        boolean newCustomerOnly,
        Integer usageLimit,
        int usedCount,
        Instant startAt,
        Instant endAt,
        ActiveStatus status,
        Instant createdAt,
        Instant updatedAt,
        List<String> applicableTierIds,
        List<UUID> applicableServiceIds
) {
}
