package com.autowash.dto;

import java.time.Instant;
import java.util.List;

public record CustomerVoucherResponse(
        String code,
        String name,
        String discountType,
        int discountValue,
        long minOrderAmount,
        Long maxDiscountAmount,
        Instant endAt,
        List<String> targetTiers
) {
}
