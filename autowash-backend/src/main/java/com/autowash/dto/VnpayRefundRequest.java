package com.autowash.dto;

public record VnpayRefundRequest(
        Long amount,
        String createdBy
) {
}
