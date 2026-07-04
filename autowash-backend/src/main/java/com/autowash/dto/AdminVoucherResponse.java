package com.autowash.dto;


import java.time.Instant;
import java.util.List;

public record AdminVoucherResponse(
        String code,
        String discountType,
        int discountValue,
        long minAmount,
        Instant expiresAt,
        boolean active,
        boolean newCustomerOnly,
        List<String> targetTiers
) {
}

