package com.autowash.service;

import com.autowash.dto.SepayPaymentResultResponse;
import java.util.UUID;

public interface SepayPaymentService {
    void handleWebhook(byte[] rawBody, String signature, String timestamp);
    SepayPaymentResultResponse queryTransaction(UUID bookingId);
}
