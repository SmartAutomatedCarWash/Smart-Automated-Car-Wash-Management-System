package com.autowash.dto;

import com.autowash.entity.enums.DiscountKind;
import com.autowash.entity.enums.DiscountTargetingMode;
import com.autowash.entity.enums.DiscountType;
import com.autowash.entity.enums.ActiveStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DiscountRequest(
        @NotNull DiscountKind type,
        String code,
        @NotBlank String name,
        String description,
        @NotNull DiscountType discountType,
        long discountValue,
        long minOrderAmount,
        Long maxDiscountAmount,
        int requiredPoints,
        Integer validDaysAfterClaim,
        @NotNull DiscountTargetingMode targetingMode,
        boolean newCustomerOnly,
        Integer usageLimit,
        @NotNull Instant startAt,
        @NotNull Instant endAt,
        @NotNull ActiveStatus status,
        List<String> applicableTierIds,
        List<UUID> applicableServiceIds
) {
}
