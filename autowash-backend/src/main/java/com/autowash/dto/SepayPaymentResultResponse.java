package com.autowash.dto;

public record SepayPaymentResultResponse(
        boolean success,
        String bookingId,
        String paymentCode,
        Long amount,
        String transactionRef,
        String message
) {
}
