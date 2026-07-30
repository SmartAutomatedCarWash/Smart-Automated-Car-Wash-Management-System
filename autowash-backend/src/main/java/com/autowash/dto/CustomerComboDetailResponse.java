package com.autowash.dto;

import java.time.Instant;
import java.util.List;

public record CustomerComboDetailResponse(
        String customerComboId,
        String comboId,
        String comboName,
        String description,
        long purchasePrice,
        int durationDays,
        String status,
        int totalUsages,
        int remainingUsages,
        String paymentStatus,
        String transactionRef,
        Instant activatedAt,
        Instant createdAt,
        Instant expiresAt,
        Instant lastUsedAt,
        List<String> imageUrls,
        List<ComboServiceItem> services,
        List<CustomerComboUsageResponse> usages
) {
}
