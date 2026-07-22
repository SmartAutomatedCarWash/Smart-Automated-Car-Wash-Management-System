package com.autowash.service;

public interface SepayPaymentService {
    void handleWebhook(byte[] rawBody, String signature, String timestamp);
}
