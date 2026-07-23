package com.autowash.dto;


import com.autowash.entity.enums.PaymentMethod;
import java.time.Instant;

public record PurchaseCustomerComboResponse(
        String customerComboId,
        String comboId,
        String comboName,
        long amount,
        PaymentMethod paymentMethod,
        String paymentStatus,
        Payment payment,
        int totalUsages,
        int remainingUsages,
        Instant activatedAt,
        Instant expiresAt,
        Instant purchasedAt
) {
    public record Payment(
            String method,
            String status,
            String transactionId,
            Instant paidAt,
            String qrUrl,
            String bankCode,
            String accountNumber,
            String accountName,
            String transferDescription
    ) {
    }
}

