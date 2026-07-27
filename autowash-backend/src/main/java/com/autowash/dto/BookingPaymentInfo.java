package com.autowash.dto;

import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import java.time.Instant;

public record BookingPaymentInfo(
        PaymentMethod method,
        PaymentStatus status,
        long amount,
        String transactionRef,
        Instant paidAt
) {
}
