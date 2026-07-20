package com.autowash.dto;

public record VnpayPaymentResultResponse(
        boolean validSignature,
        boolean success,
        String bookingId,
        String responseCode,
        String transactionStatus,
        String transactionRef,
        String message
) {
}
