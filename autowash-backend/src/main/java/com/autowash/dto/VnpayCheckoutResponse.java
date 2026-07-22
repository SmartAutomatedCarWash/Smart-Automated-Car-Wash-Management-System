package com.autowash.dto;

public record VnpayCheckoutResponse(
        String bookingId,
        String txnRef,
        long amount,
        String paymentUrl
) {
}
