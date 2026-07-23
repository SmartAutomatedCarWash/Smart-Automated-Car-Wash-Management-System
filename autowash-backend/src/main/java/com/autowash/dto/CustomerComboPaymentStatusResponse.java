package com.autowash.dto;

import java.time.Instant;

public record CustomerComboPaymentStatusResponse(
        String transactionRef,
        String paymentStatus,
        String comboStatus,
        int comboCount,
        long amount,
        Instant paidAt
) {
}
