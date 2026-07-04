package com.autowash.dto;

public record TierVoucherOfferResponse(
        String id,
        String title,
        String minTier,
        int pointsCost,
        int voucherValue,
        String accent,
        String badge
) {
}
